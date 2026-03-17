export const INCO_LIGHTNING_PROGRAM_ID = "5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj";

export interface PlainBetPayload {
  amount: number;
  isConfidential: false;
}

export type BetPayload = PlainBetPayload;

export function formatConfidentialAmount(isConfidential: boolean, amount?: number): string {
  return amount !== undefined ? `${amount.toFixed(4)} SOL` : "Unknown";
}

export function useIncoPrivacy() {
  return {
    isPrivacyEnabled: false,
    shouldEncryptBets: false,
    incoStatus: { available: false, programId: INCO_LIGHTNING_PROGRAM_ID, network: "devnet", version: "0.1.4", features: [] },
    formatAmount: formatConfidentialAmount,
  };
}
