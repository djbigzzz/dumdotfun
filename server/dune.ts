import axios from "axios";

const DUNE_SIM_BASE = "https://api.sim.dune.com/api/v1";

function duneHeaders() {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) {
    throw new Error("DUNE_API_KEY is not configured");
  }
  return {
    "X-Dune-Api-Key": apiKey,
    "Content-Type": "application/json",
  };
}

export function isDuneConfigured(): boolean {
  return !!process.env.DUNE_API_KEY;
}

export interface DuneTokenTransaction {
  txHash: string;
  blockTime: number;
  blockSlot: number;
  signers: string[];
  fee: number;
  type: string;
  transfers: DuneTransfer[];
}

export interface DuneTransfer {
  from: string;
  to: string;
  amount: string;
  tokenMint: string;
  decimals: number;
  symbol: string;
}

export interface DuneTokenActivity {
  transactions: DuneTokenTransaction[];
  total: number;
}

export interface DuneWalletBalance {
  mint: string;
  symbol: string;
  name: string;
  amount: string;
  decimals: number;
  valueUsd: number | null;
}

export interface DuneWalletPortfolio {
  walletAddress: string;
  solBalance: string;
  tokens: DuneWalletBalance[];
  totalValueUsd: number | null;
}

export interface DuneHolderInfo {
  totalHolders: number;
  top10HoldersPercent: number | null;
}

export async function getTokenActivity(mint: string, limit = 20): Promise<DuneTokenActivity> {
  const headers = duneHeaders();

  const url = `${DUNE_SIM_BASE}/solana/transactions/by_token`;
  const response = await axios.get(url, {
    headers,
    params: {
      token: mint,
      limit,
    },
    timeout: 10000,
  });

  const data = response.data;

  const transactions: DuneTokenTransaction[] = (data.transactions || data.data || []).map(
    (tx: any) => {
      const transfers: DuneTransfer[] = (tx.transfers || tx.token_transfers || []).map(
        (t: any) => ({
          from: t.from_address || t.from || "",
          to: t.to_address || t.to || "",
          amount: String(t.amount || t.raw_amount || "0"),
          tokenMint: t.token_address || t.mint || mint,
          decimals: t.decimals || 0,
          symbol: t.symbol || "",
        })
      );

      return {
        txHash: tx.hash || tx.signature || tx.tx_hash || "",
        blockTime: tx.block_time ? new Date(tx.block_time).getTime() / 1000 : (tx.block_timestamp || 0),
        blockSlot: tx.block_number || tx.slot || 0,
        signers: tx.signers || (tx.signer ? [tx.signer] : []),
        fee: tx.fee || 0,
        type: tx.transaction_type || tx.type || "transfer",
        transfers,
      };
    }
  );

  return {
    transactions,
    total: data.total || transactions.length,
  };
}

export async function getWalletPortfolio(address: string): Promise<DuneWalletPortfolio> {
  const headers = duneHeaders();

  const url = `${DUNE_SIM_BASE}/solana/balances/${address}`;
  const response = await axios.get(url, {
    headers,
    timeout: 10000,
  });

  const data = response.data;
  const balances = data.balances || data.tokens || data.data || [];

  let solBalance = "0";
  const tokens: DuneWalletBalance[] = [];
  let totalValueUsd: number | null = null;

  for (const item of balances) {
    const mint = item.token_address || item.mint || item.address || "";
    const isNative =
      mint === "So11111111111111111111111111111111111111112" ||
      mint === "native" ||
      item.is_native === true ||
      (item.symbol || "").toUpperCase() === "SOL";

    if (isNative) {
      solBalance = String(item.amount || item.balance || "0");
    } else {
      tokens.push({
        mint,
        symbol: item.symbol || "",
        name: item.name || item.symbol || "",
        amount: String(item.amount || item.balance || "0"),
        decimals: item.decimals || 0,
        valueUsd: item.value_usd || item.value || null,
      });
    }

    const val = item.value_usd || item.value || null;
    if (val !== null) {
      totalValueUsd = (totalValueUsd || 0) + val;
    }
  }

  return {
    walletAddress: address,
    solBalance,
    tokens,
    totalValueUsd,
  };
}
