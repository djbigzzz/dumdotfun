export {
  INCO_LIGHTNING_PROGRAM_ID,
  type EncryptedBet,
  type IncoLightningConfig,
  getIncoConfig,
  encryptBetAmount,
  createConfidentialBet,
  verifyBetCommitment,
  aggregateEncryptedPool,
  revealBetAmount,
  isIncoAvailable,
  IncoLightningStatus,
} from "./inco-lightning";

export {
  TOKEN_2022_PROGRAM_ID,
  type ConfidentialMint,
  type ConfidentialBalance,
  type ConfidentialTransferConfig,
  type ConfidentialTransferResult,
  createConfidentialMint,
  initializeConfidentialAccount,
  depositToConfidentialBalance,
  applyPendingBalance,
  confidentialTransfer,
  withdrawFromConfidentialBalance,
  getConfidentialBalance,
  generateTransferProof as generateToken2022TransferProof,
  verifyTransferProof,
  isToken2022ConfidentialAvailable,
  Token2022Status,
} from "./token2022-confidential";

export {
  ARCIUM_PROGRAM_ID,
  type CSPLToken,
  type EncryptedBalance,
  type CSPLTransferParams,
  createCSPLToken,
  mintConfidential,
  transferConfidential,
  getEncryptedBalance,
  decryptBalance,
  generateTransferProof as generateArciumTransferProof,
  isArciumAvailable,
  ArciumStatus,
} from "./arcium-cspl";

export {
  type StealthAddressBundle,
  type StealthAddressRecord,
  generateStealthAddress,
  scanForStealthPayments,
  generateStealthMetadata,
  parseStealthMetadata,
  verifyStealthOwnership,
  isStealthAddressAvailable,
  StealthAddressStatus,
} from "./stealth-addresses";

import { IncoLightningStatus, isIncoAvailable } from "./inco-lightning";
import { Token2022Status, isToken2022ConfidentialAvailable } from "./token2022-confidential";
import { ArciumStatus } from "./arcium-cspl";
import { StealthAddressStatus, isStealthAddressAvailable } from "./stealth-addresses";

export interface PrivacyIntegration {
  name: string;
  available: boolean;
  programId?: string;
  network: string;
  description: string;
  implementation: string;
  version?: string;
  features?: string[];
  bounty?: string;
  note?: string;
}

export function getAllPrivacyIntegrations(): PrivacyIntegration[] {
  return [
    {
      name: "Inco Lightning SDK",
      ...IncoLightningStatus,
    },
    {
      name: "Stealth Addresses",
      ...StealthAddressStatus,
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
  ];
  
  if (isIncoAvailable()) {
    features.push("Inco Lightning Confidential Betting");
    features.push("Encrypted Prediction Market Bets");
    features.push("Commitment-Based Privacy");
  }
  
  if (isStealthAddressAvailable()) {
    features.push("Stealth Addresses for Private Receiving");
    features.push("Unlinkable Token Transfers");
  }
  
  if (isToken2022ConfidentialAvailable()) {
    features.push("Token-2022 Confidential Transfers");
    features.push("Hidden Balance Amounts");
  }
  
  return features;
}

export function getPlannedPrivacyFeatures(): string[] {
  return [
    "Arcium C-SPL Private Trading",
    "Noir ZK Proofs (Aztec)",
    "On-chain Attested Decrypt",
  ];
}

export function getPrivacySummary() {
  return {
    activeFeatures: getActivePrivacyFeatures(),
    plannedFeatures: getPlannedPrivacyFeatures(),
    integrations: getAllPrivacyIntegrations(),
    incoEnabled: isIncoAvailable(),
    stealthEnabled: isStealthAddressAvailable(),
    token2022Enabled: isToken2022ConfidentialAvailable(),
  };
}
