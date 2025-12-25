import { useMutation, useQuery } from "@tanstack/react-query";
import { Connection, Transaction, Keypair, PublicKey } from "@solana/web3.js";

interface TradeQuote {
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  fee: string;
}

interface TradeResult {
  success: boolean;
  transaction?: string;
  quote?: TradeQuote;
  error?: string;
}

interface TradingStatus {
  enabled: boolean;
  programId?: string;
  message: string;
}

export function useTradingStatus() {
  return useQuery<TradingStatus>({
    queryKey: ["trading-status"],
    queryFn: async () => {
      const response = await fetch("/api/trading/status");
      if (!response.ok) throw new Error("Failed to fetch trading status");
      return response.json();
    },
    staleTime: 30000,
  });
}

export function useTradeQuote(params: {
  tokenMint: string;
  amount: string;
  isBuy: boolean;
  enabled?: boolean;
}) {
  return useQuery<TradeResult>({
    queryKey: ["trade-quote", params.tokenMint, params.amount, params.isBuy],
    queryFn: async () => {
      const response = await fetch("/api/trading/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenMint: params.tokenMint,
          amount: params.amount,
          isBuy: params.isBuy,
        }),
      });
      return response.json();
    },
    enabled: params.enabled && !!params.tokenMint && !!params.amount,
    staleTime: 5000,
  });
}

export function useBuyToken() {
  return useMutation({
    mutationFn: async (params: {
      userWallet: string;
      tokenMint: string;
      solAmount: string;
      slippageBps?: number;
    }) => {
      const response = await fetch("/api/trading/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: params.userWallet,
          tokenMint: params.tokenMint,
          amount: params.solAmount,
          slippageBps: params.slippageBps || 500,
        }),
      });

      const result: TradeResult = await response.json();
      
      if (!result.success || !result.transaction) {
        throw new Error(result.error || "Failed to build transaction");
      }

      return result;
    },
  });
}

export function useSellToken() {
  return useMutation({
    mutationFn: async (params: {
      userWallet: string;
      tokenMint: string;
      tokenAmount: string;
      slippageBps?: number;
    }) => {
      const response = await fetch("/api/trading/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: params.userWallet,
          tokenMint: params.tokenMint,
          amount: params.tokenAmount,
          slippageBps: params.slippageBps || 500,
        }),
      });

      const result: TradeResult = await response.json();
      
      if (!result.success || !result.transaction) {
        throw new Error(result.error || "Failed to build transaction");
      }

      return result;
    },
  });
}

export function useCreateTokenOnContract() {
  return useMutation({
    mutationFn: async (params: {
      creator: string;
      name: string;
      symbol: string;
      uri: string;
    }) => {
      const mintKeypair = Keypair.generate();
      
      const response = await fetch("/api/trading/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator: params.creator,
          mint: mintKeypair.publicKey.toString(),
          name: params.name,
          symbol: params.symbol,
          uri: params.uri,
        }),
      });

      const result: TradeResult = await response.json();
      
      if (!result.success || !result.transaction) {
        throw new Error(result.error || "Failed to build create token transaction");
      }

      return {
        ...result,
        mintKeypair,
        mintPublicKey: mintKeypair.publicKey.toString(),
      };
    },
  });
}

export async function signAndSendTransaction(
  transactionBase64: string,
  additionalSigners: Keypair[] = []
): Promise<string> {
  const phantom = (window as any).solana;
  
  if (!phantom || !phantom.isPhantom) {
    throw new Error("Phantom wallet not found");
  }

  const connection = new Connection(
    import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    "confirmed"
  );

  const transactionBuffer = Buffer.from(transactionBase64, "base64");
  const transaction = Transaction.from(transactionBuffer);

  for (const signer of additionalSigners) {
    transaction.partialSign(signer);
  }

  const signedTransaction = await phantom.signTransaction(transaction);
  
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  
  await connection.confirmTransaction(signature, "confirmed");
  
  return signature;
}

export function formatLamportsToSol(lamports: string | number): string {
  const value = typeof lamports === "string" ? parseInt(lamports, 10) : lamports;
  return (value / 1e9).toFixed(4);
}

export function formatTokenAmount(amount: string | number): string {
  const value = typeof amount === "string" ? parseInt(amount, 10) : amount;
  return (value / 1e6).toLocaleString();
}

export function solToLamports(sol: number): string {
  return Math.floor(sol * 1e9).toString();
}

export function tokensToSmallestUnit(tokens: number): string {
  return Math.floor(tokens * 1e6).toString();
}
