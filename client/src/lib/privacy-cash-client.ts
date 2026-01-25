import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const HELIUS_RPC = `https://devnet.helius-rpc.com/?api-key=${import.meta.env.VITE_HELIUS_API_KEY || ""}`;
const DEVNET_RPC = "https://api.devnet.solana.com";

interface PrivateCashBalance {
  sol: number;
  lamports: number;
}

interface DepositResult {
  success: boolean;
  signature?: string;
  error?: string;
}

interface WithdrawResult {
  success: boolean;
  signature?: string;
  error?: string;
}

class PrivacyCashClient {
  private connection: Connection;
  private walletAddress: string | null = null;
  private privateBalance: number = 0;

  constructor() {
    this.connection = new Connection(HELIUS_RPC || DEVNET_RPC, "confirmed");
  }

  setWallet(walletAddress: string) {
    this.walletAddress = walletAddress;
    const stored = localStorage.getItem(`privacy_cash_balance_${walletAddress}`);
    if (stored) {
      this.privateBalance = parseFloat(stored);
    }
  }

  async getPrivateBalance(): Promise<PrivateCashBalance> {
    if (!this.walletAddress) {
      return { sol: 0, lamports: 0 };
    }

    try {
      const res = await fetch(`/api/privacy/cash/balance/${this.walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        const balance = data.balance?.privateBalance || this.privateBalance;
        return {
          sol: balance,
          lamports: balance * LAMPORTS_PER_SOL
        };
      }
    } catch (error) {
      console.error("Failed to fetch private balance:", error);
    }

    return {
      sol: this.privateBalance,
      lamports: this.privateBalance * LAMPORTS_PER_SOL
    };
  }

  async deposit(amountSol: number, signTransaction: (tx: any) => Promise<any>): Promise<DepositResult> {
    if (!this.walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }

    try {
      const res = await fetch("/api/privacy/cash/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: this.walletAddress,
          amount: amountSol,
          token: "SOL"
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        this.privateBalance += amountSol;
        localStorage.setItem(`privacy_cash_balance_${this.walletAddress}`, this.privateBalance.toString());

        return {
          success: true,
          signature: data.signature || data.commitment || "demo_deposit_" + Date.now()
        };
      } else {
        const error = await res.json();
        return { success: false, error: error.error || "Deposit failed" };
      }
    } catch (error: any) {
      console.error("Privacy Cash deposit error:", error);
      return { success: false, error: error.message || "Deposit failed" };
    }
  }

  async withdraw(amountSol: number, recipientAddress: string): Promise<WithdrawResult> {
    if (!this.walletAddress) {
      return { success: false, error: "Wallet not connected" };
    }

    if (amountSol > this.privateBalance) {
      return { success: false, error: "Insufficient private balance" };
    }

    try {
      const res = await fetch("/api/privacy/cash/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: this.walletAddress,
          recipientAddress: recipientAddress,
          amount: amountSol,
          token: "SOL"
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        this.privateBalance -= amountSol;
        localStorage.setItem(`privacy_cash_balance_${this.walletAddress}`, this.privateBalance.toString());

        return {
          success: true,
          signature: data.signature || data.nullifier || "demo_withdraw_" + Date.now()
        };
      } else {
        const error = await res.json();
        return { success: false, error: error.error || "Withdrawal failed" };
      }
    } catch (error: any) {
      console.error("Privacy Cash withdraw error:", error);
      return { success: false, error: error.message || "Withdrawal failed" };
    }
  }

  getStoredBalance(): number {
    return this.privateBalance;
  }
}

export const privacyCashClient = new PrivacyCashClient();
export type { PrivateCashBalance, DepositResult, WithdrawResult };
