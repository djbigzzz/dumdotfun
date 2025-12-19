import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

const PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local";
const PUMP_IPFS_API = "https://pump.fun/api/ipfs";

interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

interface IPFSUploadResult {
  metadataUri: string;
}

interface TradeResult {
  transaction: string;
}

export async function uploadMetadataToIPFS(
  metadata: TokenMetadata,
  imageBase64?: string
): Promise<IPFSUploadResult> {
  const formData = new FormData();
  
  formData.append("name", metadata.name);
  formData.append("symbol", metadata.symbol);
  formData.append("description", metadata.description || "");
  
  if (metadata.twitter) formData.append("twitter", metadata.twitter);
  if (metadata.telegram) formData.append("telegram", metadata.telegram);
  if (metadata.website) formData.append("website", metadata.website);
  
  if (imageBase64) {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: mimeType });
      const extension = mimeType.split("/")[1] || "png";
      formData.append("file", blob, `token-image.${extension}`);
    }
  }
  
  formData.append("showName", "true");

  const response = await fetch(PUMP_IPFS_API, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("IPFS upload failed:", errorText);
    throw new Error(`IPFS upload failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.metadataUri) {
    throw new Error("IPFS response missing metadataUri");
  }

  return { metadataUri: result.metadataUri };
}

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
  
  const transaction = bs58.encode(transactionBytes);

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
  const transaction = bs58.encode(new Uint8Array(transactionData));

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
  const transaction = bs58.encode(new Uint8Array(transactionData));

  return { transaction };
}

export function deserializeTransaction(base58Transaction: string): VersionedTransaction {
  const transactionBytes = bs58.decode(base58Transaction);
  return VersionedTransaction.deserialize(transactionBytes);
}
