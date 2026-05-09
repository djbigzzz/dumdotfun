import { VersionedTransaction } from "@solana/web3.js";
import bs58Module from "bs58";
const bs58 = ((bs58Module as any).default ?? bs58Module) as { encode: (b: Uint8Array) => string; decode: (s: string) => Uint8Array };
const bs58Encode = bs58.encode;
const bs58Decode = bs58.decode;
const PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local";

interface TradeResult {
  transaction: string;
}

// NOTE: pump.fun's IPFS pinning service was removed from this file as part
// of cutting the competitor (and unreliable) dependency out of the launch
// path. Token metadata is now self-hosted at /api/token-metadata/:mint.

export async function buildCreateTokenTransaction(
  creatorPublicKey: string,
  mintPublicKey: string,
  metadataUri: string,
  tokenName: string,
  tokenSymbol: string,
  initialBuyAmountSol: number = 0
): Promise<{ transaction: string; mint: string }> {
  const payload = {
    publicKey: creatorPublicKey,
    action: "create",
    tokenMetadata: {
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUri,
    },
    mint: mintPublicKey,
    denominatedInSol: "true",
    amount: initialBuyAmountSol,
    slippage: 10,
    priorityFee: 0.0005,
    pool: "pump",
  };

  console.log("PumpPortal create request:", JSON.stringify(payload, null, 2));

  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PumpPortal create failed:", errorText);
    throw new Error(`PumpPortal API failed: ${response.status} ${errorText}`);
  }

  const transactionData = await response.arrayBuffer();
  const transactionBytes = new Uint8Array(transactionData);
  
  const transaction = bs58Encode(transactionBytes);

  return {
    transaction,
    mint: mintPublicKey,
  };
}

export async function buildBuyTransaction(
  buyerPublicKey: string,
  mintAddress: string,
  amountSol: number,
  slippage: number = 10
): Promise<TradeResult> {
  const payload = {
    publicKey: buyerPublicKey,
    action: "buy",
    mint: mintAddress,
    denominatedInSol: "true",
    amount: amountSol,
    slippage,
    priorityFee: 0.0005,
    pool: "pump",
  };

  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Buy transaction failed: ${response.status} ${errorText}`);
  }

  const transactionData = await response.arrayBuffer();
  const transaction = bs58Encode(new Uint8Array(transactionData));

  return { transaction };
}

export async function buildSellTransaction(
  sellerPublicKey: string,
  mintAddress: string,
  tokenAmount: number | string,
  slippage: number = 10
): Promise<TradeResult> {
  const payload = {
    publicKey: sellerPublicKey,
    action: "sell",
    mint: mintAddress,
    denominatedInSol: "false",
    amount: tokenAmount,
    slippage,
    priorityFee: 0.0005,
    pool: "pump",
  };

  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sell transaction failed: ${response.status} ${errorText}`);
  }

  const transactionData = await response.arrayBuffer();
  const transaction = bs58Encode(new Uint8Array(transactionData));

  return { transaction };
}

export function deserializeTransaction(base58Transaction: string): VersionedTransaction {
  const transactionBytes = bs58Decode(base58Transaction);
  return VersionedTransaction.deserialize(transactionBytes);
}
