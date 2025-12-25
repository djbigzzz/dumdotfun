import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import FormData from "form-data";
import sharp from "sharp";
import axios from "axios";

const PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local";
const PUMP_IPFS_API = "https://pump.fun/api/ipfs";
const MAX_IMAGE_SIZE = 500 * 1024;
const MAX_IMAGE_DIMENSION = 512;

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

async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}, ${imageBuffer.length} bytes`);
    
    let pipeline = sharp(imageBuffer);
    
    if ((metadata.width && metadata.width > MAX_IMAGE_DIMENSION) || 
        (metadata.height && metadata.height > MAX_IMAGE_DIMENSION)) {
      pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    const compressed = await pipeline
      .png({ quality: 80, compressionLevel: 9 })
      .toBuffer();
    
    console.log(`Compressed image: ${compressed.length} bytes`);
    return compressed;
  } catch (error) {
    console.error("Image compression failed:", error);
    return imageBuffer;
  }
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
  formData.append("showName", "true");
  
  let imageBuffer: Buffer;
  
  if (imageBase64) {
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const base64Data = matches[2];
      imageBuffer = Buffer.from(base64Data, "base64");
      console.log(`Original image size: ${imageBuffer.length} bytes`);
      
      if (imageBuffer.length > MAX_IMAGE_SIZE) {
        console.log("Image too large, compressing...");
        imageBuffer = await compressImage(imageBuffer);
      }
    } else {
      console.log("Image base64 format not recognized, using placeholder");
      imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
    }
  } else {
    console.log("No image provided, using placeholder");
    imageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
  }
  
  formData.append("file", imageBuffer, {
    filename: "token.png",
    contentType: "image/png",
  });

  console.log("Uploading to pump.fun IPFS...", {
    name: metadata.name,
    symbol: metadata.symbol,
    imageSize: imageBuffer.length,
  });

  try {
    const response = await axios.post(PUMP_IPFS_API, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000,
    });

    console.log("IPFS response status:", response.status, "body:", JSON.stringify(response.data));

    if (!response.data.metadataUri) {
      throw new Error("IPFS response missing metadataUri");
    }

    return { metadataUri: response.data.metadataUri };
  } catch (error: any) {
    if (error.response) {
      console.error("IPFS upload failed:", error.response.status, error.response.data);
      throw new Error(`IPFS upload failed: ${error.response.status} ${JSON.stringify(error.response.data)}`);
    }
    console.error("IPFS upload error:", error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
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
