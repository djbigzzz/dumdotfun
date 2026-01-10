export * from "./inco-lightning";
export * from "./token2022-confidential";
export * from "./arcium-cspl";

import { IncoLightningStatus } from "./inco-lightning";
import { Token2022Status } from "./token2022-confidential";
import { ArciumStatus } from "./arcium-cspl";

export interface PrivacyIntegration {
  name: string;
  available: boolean;
  programId: string;
  network: string;
  description: string;
  bountyAmount: string;
  implementation: string;
  note?: string;
}

export function getAllPrivacyIntegrations(): PrivacyIntegration[] {
  return [
    {
      name: "Inco Lightning SDK",
      ...IncoLightningStatus,
    },
    {
      name: "Token-2022 Confidential Transfers",
      ...Token2022Status,
    },
    {
      name: "Arcium C-SPL",
      ...ArciumStatus,
    },
  ];
}

export function getActivePrivacyFeatures(): string[] {
  const features: string[] = [
    "Helius RPC Integration",
    "Anonymous Token Creation",
    "Confidential Betting (Database)",
  ];
  
  return features;
}

export function getPlannedPrivacyFeatures(): string[] {
  return [
    "Inco Lightning SDK ($2K bounty)",
    "Token-2022 Confidential Transfers ($15K)",
    "Arcium C-SPL ($10K bounty)",
    "Noir ZK Proofs ($5K Aztec bounty)",
  ];
}

export function getPrivacySummary() {
  return {
    activeFeatures: getActivePrivacyFeatures(),
    plannedFeatures: getPlannedPrivacyFeatures(),
    integrations: getAllPrivacyIntegrations(),
    totalBountyPotential: "$57,500",
    hackathon: "Solana Privacy Hack 2026",
    deadline: "January 30, 2026",
  };
}
