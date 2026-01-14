export interface ConfidentialTransferResult {
  signature: string;
  commitment: string;
  rangeProof: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}

export interface ConfidentialTransferProofs {
  equalityProof: string;
  validityProof: string;
  rangeProof: string;
}

export async function createConfidentialTransfer(
  mintAddress: string,
  amount: number,
  senderWallet: string,
  recipientWallet: string
): Promise<ConfidentialTransferResult & { proofs: ConfidentialTransferProofs }> {
  console.log("[Token-2022 Client] Creating confidential transfer of", amount);
  
  const response = await fetch("/api/privacy/confidential-transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mintAddress,
      amount,
      senderWallet,
      recipientWallet,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create confidential transfer");
  }
  
  return await response.json();
}

export function formatConfidentialBalance(isHidden: boolean, amount?: number): string {
  if (isHidden) {
    return "🔒 ••••••";
  }
  return amount !== undefined ? `${amount.toLocaleString()} tokens` : "Unknown";
}

export function getToken2022Status() {
  return {
    available: true,
    programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    network: "devnet",
    version: "commitment-based",
    note: "Using commitment scheme while ZK ElGamal program is in audit",
    features: [
      "Pedersen commitments for balance hiding",
      "Range proofs for valid amounts",
      "Homomorphic balance updates",
      "Auditor key support",
    ],
  };
}

export function isConfidentialTransferSupported(): boolean {
  return true;
}
