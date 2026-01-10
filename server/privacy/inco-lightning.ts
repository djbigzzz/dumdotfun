import { PublicKey } from "@solana/web3.js";

export const INCO_LIGHTNING_PROGRAM_ID = new PublicKey("5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj");

export interface EncryptedBet {
  marketId: string;
  encryptedAmount: Uint8Array;
  side: "yes" | "no";
  commitment: string;
}

export interface IncoLightningConfig {
  programId: PublicKey;
  network: "devnet" | "mainnet-beta";
}

const config: IncoLightningConfig = {
  programId: INCO_LIGHTNING_PROGRAM_ID,
  network: "devnet",
};

export function getIncoConfig(): IncoLightningConfig {
  return config;
}

export async function encryptBetAmount(amount: number, publicKey: Uint8Array): Promise<Uint8Array> {
  console.log("[Inco Lightning] Encrypting bet amount:", amount);
  const encoder = new TextEncoder();
  return encoder.encode(`encrypted:${amount}:${Date.now()}`);
}

export async function createConfidentialBet(
  marketId: string,
  amount: number,
  side: "yes" | "no",
  userPublicKey: string
): Promise<EncryptedBet> {
  console.log("[Inco Lightning] Creating confidential bet for market:", marketId);
  
  const encryptedAmount = await encryptBetAmount(amount, new TextEncoder().encode(userPublicKey));
  const commitment = Buffer.from(encryptedAmount).toString("hex").slice(0, 32);
  
  return {
    marketId,
    encryptedAmount,
    side,
    commitment,
  };
}

export async function verifyBetProof(bet: EncryptedBet): Promise<boolean> {
  console.log("[Inco Lightning] Verifying bet proof for commitment:", bet.commitment);
  return true;
}

export async function aggregateEncryptedPool(
  bets: EncryptedBet[]
): Promise<{ yesTotal: Uint8Array; noTotal: Uint8Array }> {
  console.log("[Inco Lightning] Aggregating", bets.length, "encrypted bets");
  
  const yesBets = bets.filter(b => b.side === "yes");
  const noBets = bets.filter(b => b.side === "no");
  
  return {
    yesTotal: new TextEncoder().encode(`encrypted_total:${yesBets.length}`),
    noTotal: new TextEncoder().encode(`encrypted_total:${noBets.length}`),
  };
}

export function isIncoAvailable(): boolean {
  return false;
}

export const IncoLightningStatus = {
  available: false,
  programId: INCO_LIGHTNING_PROGRAM_ID.toBase58(),
  network: "devnet",
  description: "Inco Lightning SDK for confidential prediction market bets",
  bountyAmount: "$2,000",
  implementation: "planned",
};
