import axios from "axios";

// Dune Sim API (https://sim.dune.com) - separate product from Dune Analytics.
// Base URL and header name are specific to Sim - if you accidentally use a
// Dune Analytics key here you will get HTTP 401 "invalid API Key".
const DUNE_SIM_BASE = "https://api.sim.dune.com/beta/svm";

function duneHeaders() {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) {
    throw new Error("DUNE_API_KEY is not configured");
  }
  return {
    "X-Sim-Api-Key": apiKey,
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

// Sim's transactions endpoint is keyed by wallet address, not by token mint.
// Calling it with a mint returns an empty array. We keep this function for
// backward compatibility but it will just return an empty list when called
// with a token mint - higher layers should fall back to Helius/on-chain
// indexing for per-token trade history.
export async function getTokenActivity(mint: string, limit = 20): Promise<DuneTokenActivity> {
  const headers = duneHeaders();

  const url = `${DUNE_SIM_BASE}/transactions/${mint}`;
  const response = await axios.get(url, {
    headers,
    params: { limit },
    timeout: 10000,
  });

  const data = response.data;

  const transactions: DuneTokenTransaction[] = (data.transactions || []).map(
    (tx: any) => {
      const raw = tx.raw_transaction?.transaction?.message;
      const accountKeys: string[] = raw?.accountKeys || [];
      const numSigs: number = raw?.header?.numRequiredSignatures || 0;
      const signers = accountKeys.slice(0, numSigs);

      // Sim returns block_time in microseconds since epoch.
      const blockTimeSec = tx.block_time
        ? Math.floor(tx.block_time / 1_000_000)
        : 0;

      return {
        txHash: tx.raw_transaction?.transaction?.signatures?.[0] || "",
        blockTime: blockTimeSec,
        blockSlot: tx.block_slot || 0,
        signers,
        fee: tx.raw_transaction?.meta?.fee || 0,
        type: "transfer",
        transfers: [],
      };
    }
  );

  return {
    transactions,
    total: transactions.length,
  };
}

export async function getWalletPortfolio(address: string): Promise<DuneWalletPortfolio> {
  const headers = duneHeaders();

  // Cap at 100 balances - the dropdown UI only shows top holdings anyway and
  // Sim's largest wallets can return thousands of dust positions otherwise.
  const url = `${DUNE_SIM_BASE}/balances/${address}`;
  const response = await axios.get(url, {
    headers,
    params: { limit: 100 },
    timeout: 10000,
  });

  const data = response.data;
  const balances: any[] = data.balances || [];

  let solBalance = "0";
  const tokens: DuneWalletBalance[] = [];
  let totalValueUsd: number | null = null;

  const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

  for (const item of balances) {
    const mint: string = item.address || "";
    const isNative =
      mint === NATIVE_SOL_MINT ||
      mint === "native" ||
      (item.symbol || "").toUpperCase() === "SOL";

    // Sim returns both `amount` (raw) and `balance` (decimal-adjusted as a
    // string). We expose the human-readable balance for UI purposes.
    const humanAmount = String(item.balance ?? item.amount ?? "0");
    const valUsd: number | null = typeof item.value_usd === "number" ? item.value_usd : null;

    if (isNative) {
      solBalance = humanAmount;
    } else {
      tokens.push({
        mint,
        symbol: item.symbol || "",
        name: item.name || item.symbol || "",
        amount: humanAmount,
        decimals: typeof item.decimals === "number" ? item.decimals : 0,
        valueUsd: valUsd,
      });
    }

    if (valUsd !== null) {
      totalValueUsd = (totalValueUsd ?? 0) + valUsd;
    }
  }

  return {
    walletAddress: address,
    solBalance,
    tokens,
    totalValueUsd,
  };
}
