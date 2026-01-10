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
    "Inco Lightning SDK",
    "Token-2022 Confidential Transfers",
    "Arcium C-SPL",
    "Noir ZK Proofs",
  ];
}

export function getPrivacySummary() {
  return {
    activeFeatures: getActivePrivacyFeatures(),
    plannedFeatures: getPlannedPrivacyFeatures(),
    integrations: getAllPrivacyIntegrations(),
  };
}
