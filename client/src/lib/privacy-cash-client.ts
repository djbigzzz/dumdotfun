import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Use public devnet RPC — Helius API key should NOT be exposed client-side
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

  constructor() {
    this.connection = new Connection(DEVNET_RPC, "confirmed");
  }

  setWallet(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  async getPrivateBalance(): Promise<PrivateCashBalance> {
    if (!this.walletAddress) {
      return { sol: 0, lamports: 0 };
    }

    try {
      const res = await fetch(`/api/privacy/cash/balance/${this.walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        const balance = data.balance?.privateBalance || 0;
        return {
          sol: balance,
          lamports: balance * LAMPORTS_PER_SOL
        };
      }
    } catch (error) {
      console.error("Failed to fetch private balance:", error);
    }

    return {
      sol: 0,
      lamports: 0
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

  async getStoredBalance(): Promise<number> {
    const bal = await this.getPrivateBalance();
    return bal.sol;
  }
}

export const privacyCashClient = new PrivacyCashClient();
export type { PrivateCashBalance, DepositResult, WithdrawResult };
