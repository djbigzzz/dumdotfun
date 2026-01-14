export interface StealthAddressBundle {
  stealthAddress: string;
  ephemeralPublicKey: string;
  viewTag: string;
  metadata: string;
}

export interface StealthOwnershipResult {
  isOwner: boolean;
  message: string;
}

export async function generateStealthAddress(
  recipientWallet: string,
  tokenMint?: string
): Promise<StealthAddressBundle> {
  console.log("[Stealth Client] Generating stealth address for:", recipientWallet.slice(0, 8) + "...");
  
  const response = await fetch("/api/privacy/stealth-address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientWallet, tokenMint }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to generate stealth address");
  }
  
  const data = await response.json();
  return {
    stealthAddress: data.stealthAddress,
    ephemeralPublicKey: data.ephemeralPublicKey,
    viewTag: data.viewTag,
    metadata: data.metadata,
  };
}

export async function verifyStealthOwnership(
  ownerWallet: string,
  stealthAddress: string,
  ephemeralPublicKey: string
): Promise<StealthOwnershipResult> {
  console.log("[Stealth Client] Verifying ownership of stealth address");
  
  const response = await fetch("/api/privacy/verify-stealth-ownership", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerWallet, stealthAddress, ephemeralPublicKey }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to verify ownership");
  }
  
  const data = await response.json();
  return {
    isOwner: data.isOwner,
    message: data.message,
  };
}

export function formatStealthAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getStealthStatus() {
  return {
    available: true,
    version: "1.0.0",
    features: [
      "One-time receive addresses",
      "View tag scanning",
      "Unlinkable transactions",
      "Works with any SPL token",
    ],
  };
}
