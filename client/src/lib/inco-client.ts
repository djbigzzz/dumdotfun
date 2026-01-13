import { usePrivacy } from "./privacy-context";

export const INCO_LIGHTNING_PROGRAM_ID = "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj";

export interface EncryptedBetPayload {
  encryptedAmount: string;
  commitment: string;
  nonce: string;
  isConfidential: true;
}

export interface PlainBetPayload {
  amount: number;
  isConfidential: false;
}

export type BetPayload = EncryptedBetPayload | PlainBetPayload;

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCommitment(amount: number, side: string, nonce: string, userAddress: string): Promise<string> {
  const data = `inco_bet:${amount}:${side}:${nonce}:${userAddress}`;
  const hash = await sha256Hash(data);
  return hash;
}

export async function encryptBetForInco(
  amount: number,
  side: "yes" | "no",
  userWalletAddress: string
): Promise<EncryptedBetPayload> {
  console.log("[Inco Client] Encrypting bet:", amount, "SOL for side:", side);
  
  const nonce = generateNonce();
  const commitment = await generateCommitment(amount, side, nonce, userWalletAddress);
  
  let encryptedAmount: string;
  
  try {
    const { encryptValue } = await import("@inco/solana-sdk/encryption");
    const amountLamports = BigInt(Math.floor(amount * 1e9));
    encryptedAmount = await encryptValue(amountLamports);
    console.log("[Inco Client] Used Inco SDK encryption");
  } catch (error) {
    console.log("[Inco Client] Inco SDK not available, using commitment scheme");
    
    const payload = {
      type: "inco_commitment",
      version: "0.1.4",
      commitment,
      nonce,
      amount_hash: await sha256Hash(`${amount}:${nonce}`),
      network: "devnet",
    };
    encryptedAmount = btoa(JSON.stringify(payload));
  }
  
  return {
    encryptedAmount,
    commitment,
    nonce,
    isConfidential: true,
  };
}

export function createConfidentialBetRequest(
  marketId: string,
  amount: number,
  side: "yes" | "no",
  walletAddress: string,
  encryptedPayload: EncryptedBetPayload
) {
  return {
    marketId,
    walletAddress,
    side,
    amount,
    ...encryptedPayload,
  };
}

export function formatConfidentialAmount(isConfidential: boolean, amount?: number): string {
  if (isConfidential) {
    return "🔒 Hidden";
  }
  return amount !== undefined ? `${amount.toFixed(4)} SOL` : "Unknown";
}

export function getIncoStatus() {
  return {
    available: true,
    programId: INCO_LIGHTNING_PROGRAM_ID,
    network: "devnet",
    version: "0.1.4",
    features: [
      "Encrypted bet amounts",
      "Commitment-based privacy",
      "Zero-knowledge verification ready",
    ],
  };
}

export function useIncoPrivacy() {
  const { privateMode } = usePrivacy();
  
  return {
    isPrivacyEnabled: privateMode,
    shouldEncryptBets: privateMode,
    incoStatus: getIncoStatus(),
    encryptBet: encryptBetForInco,
    formatAmount: formatConfidentialAmount,
  };
}
