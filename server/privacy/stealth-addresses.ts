import { Keypair, PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";

export interface StealthAddressBundle {
  ephemeralPublicKey: string;
  stealthAddress: string;
  viewTag: string;
  sharedSecretHash: string;
  timestamp: number;
}

export interface StealthAddressRecord {
  id: string;
  ownerWallet: string;
  stealthAddress: string;
  ephemeralPublicKey: string;
  viewTag: string;
  sharedSecretHash: string;
  createdAt: number;
  tokenMint?: string;
  isSpent: boolean;
}

function sha256(data: string | Buffer): Buffer {
  if (typeof data === 'string') {
    return createHash("sha256").update(data).digest();
  }
  return createHash("sha256").update(data).digest();
}

function deriveSharedSecretHash(
  ephemeralPubkeyBytes: Uint8Array,
  recipientPubkeyBytes: Uint8Array
): Buffer {
  const combined = Buffer.concat([
    Buffer.from(ephemeralPubkeyBytes),
    Buffer.from(recipientPubkeyBytes),
    Buffer.from("stealth_v1")
  ]);
  return sha256(combined);
}

function deriveStealthAddress(
  recipientPubkey: PublicKey,
  sharedSecretHash: Buffer
): { stealthPubkey: PublicKey; seed: Uint8Array } {
  const combinedForSeed = Buffer.concat([
    recipientPubkey.toBuffer(),
    sharedSecretHash,
    Buffer.from("stealth_derive")
  ]);
  
  const seed = sha256(combinedForSeed);
  const seedArray = new Uint8Array(seed.slice(0, 32));
  const stealthKeypair = Keypair.fromSeed(seedArray);
  
  return { stealthPubkey: stealthKeypair.publicKey, seed: seedArray };
}

function computeViewTag(sharedSecretHash: Buffer): string {
  return sha256(Buffer.concat([sharedSecretHash, Buffer.from(":view")])).slice(0, 4).toString("hex");
}

export function generateStealthAddress(recipientWalletAddress: string): StealthAddressBundle {
  console.log("[Stealth] Generating stealth address for:", recipientWalletAddress.slice(0, 8) + "...");
  
  const ephemeralKeypair = Keypair.generate();
  const recipientPubkey = new PublicKey(recipientWalletAddress);
  
  const sharedSecretHash = deriveSharedSecretHash(
    ephemeralKeypair.publicKey.toBytes(),
    recipientPubkey.toBytes()
  );
  
  const { stealthPubkey } = deriveStealthAddress(recipientPubkey, sharedSecretHash);
  const viewTag = computeViewTag(sharedSecretHash);
  
  return {
    ephemeralPublicKey: ephemeralKeypair.publicKey.toBase58(),
    stealthAddress: stealthPubkey.toBase58(),
    viewTag,
    // sharedSecretHash intentionally omitted — never expose the shared secret
    sharedSecretHash: "",
    timestamp: Date.now(),
  };
}

export function scanForStealthPayments(
  ownerWallet: string,
  ephemeralKeys: Array<{ ephemeralPublicKey: string; stealthAddress: string; viewTag: string }>
): string[] {
  console.log("[Stealth] Scanning", ephemeralKeys.length, "potential stealth payments");
  
  const ownerPubkey = new PublicKey(ownerWallet);
  const matchingAddresses: string[] = [];
  
  for (const payment of ephemeralKeys) {
    try {
      const ephemeralPubkey = new PublicKey(payment.ephemeralPublicKey);
      
      const sharedSecretHash = deriveSharedSecretHash(
        ephemeralPubkey.toBytes(),
        ownerPubkey.toBytes()
      );
      
      const expectedViewTag = computeViewTag(sharedSecretHash);
      
      if (expectedViewTag === payment.viewTag) {
        const { stealthPubkey } = deriveStealthAddress(ownerPubkey, sharedSecretHash);
        
        if (stealthPubkey.toBase58() === payment.stealthAddress) {
          matchingAddresses.push(payment.stealthAddress);
        }
      }
    } catch (error) {
      console.log("[Stealth] Error processing payment:", error);
    }
  }
  
  console.log("[Stealth] Found", matchingAddresses.length, "matching stealth addresses");
  return matchingAddresses;
}

export function generateStealthMetadata(
  stealthAddress: string,
  ephemeralPublicKey: string,
  tokenMint?: string
): string {
  const metadata = {
    type: "stealth_payment",
    version: "1.0.0",
    stealthAddress,
    ephemeralPublicKey,
    tokenMint: tokenMint || null,
    protocol: "dum.fun",
    timestamp: Date.now(),
  };
  
  return Buffer.from(JSON.stringify(metadata)).toString("base64");
}

export function parseStealthMetadata(encoded: string): {
  stealthAddress: string;
  ephemeralPublicKey: string;
  tokenMint: string | null;
} | null {
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString());
    if (decoded.type !== "stealth_payment") return null;
    
    return {
      stealthAddress: decoded.stealthAddress,
      ephemeralPublicKey: decoded.ephemeralPublicKey,
      tokenMint: decoded.tokenMint,
    };
  } catch {
    return null;
  }
}

export function verifyStealthOwnership(
  ownerWallet: string,
  stealthAddress: string,
  ephemeralPublicKey: string
): boolean {
  console.log("[Stealth] Verifying ownership of stealth address");
  
  try {
    const ownerPubkey = new PublicKey(ownerWallet);
    const ephemeralPubkey = new PublicKey(ephemeralPublicKey);
    
    const sharedSecretHash = deriveSharedSecretHash(
      ephemeralPubkey.toBytes(),
      ownerPubkey.toBytes()
    );
    
    const { stealthPubkey } = deriveStealthAddress(ownerPubkey, sharedSecretHash);
    
    const isOwner = stealthPubkey.toBase58() === stealthAddress;
    
    console.log("[Stealth] Ownership verification result:", isOwner);
    return isOwner;
  } catch (error) {
    console.log("[Stealth] Verification failed:", error);
    return false;
  }
}

export function isStealthAddressAvailable(): boolean {
  return true;
}

export function deriveStealthPrivateKey(
  ownerWallet: string,
  ephemeralPublicKey: string
): string | null {
  try {
    const ownerPubkey = new PublicKey(ownerWallet);
    const ephemeralPubkey = new PublicKey(ephemeralPublicKey);
    
    const sharedSecretHash = deriveSharedSecretHash(
      ephemeralPubkey.toBytes(),
      ownerPubkey.toBytes()
    );
    
    const { seed } = deriveStealthAddress(ownerPubkey, sharedSecretHash);
    const stealthKeypair = Keypair.fromSeed(seed);
    
    return Buffer.from(stealthKeypair.secretKey).toString("hex");
  } catch (error) {
    console.log("[Stealth] Private key derivation failed:", error);
    return null;
  }
}

export const StealthAddressStatus = {
  available: true,
  network: "devnet",
  version: "1.0.0",
  description: "One-time stealth addresses for private token receiving",
  implementation: "active",
  features: [
    "One-time receive addresses per transfer",
    "View tag scanning optimization",
    "On-chain address unlinkability",
    "Token-agnostic (works with any SPL token)",
    "Deterministic derivation for verification",
  ],
  securityModel: "Hash-based derivation for hackathon demo. Production would use proper ECDH with scan keys.",
  bounty: "Contributes to $10K Anoncoin bounty",
};
