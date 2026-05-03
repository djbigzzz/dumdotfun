/**
 * Torque Quests + SagaPad + Zerion Portfolio — MCP Bundle Integration
 *
 * This module exposes the dum.fun integration surface for three composable
 * Solana ecosystem MCP-bundle partners:
 *
 *  - Torque   — on-chain quest engine; powers dum.fun's degen-tier quest rewards
 *  - SagaPad  — Solana Mobile (Saga / Seeker) launch surface; dum.fun token
 *               creators can opt-in to SagaPad distribution at launch
 *  - Zerion   — multi-chain portfolio; dum.fun wallet pages link out to a
 *               Zerion-style cross-chain view
 *
 * Track: Solana MCP Bundle (Torque + SagaPad + Zerion) — Colosseum Frontier 2026
 */

export const TORQUE_CONFIG = {
  apiBase: "https://api.torque.so",
  questEngine: "torque-onchain-quests-v2",
  features: [
    "On-chain quest verification — no centralised attestation required",
    "Composable reward primitives (SPL tokens, NFTs, points)",
    "Cross-protocol quest chaining for retention loops",
  ],
  track: "Solana MCP Bundle — Torque + SagaPad + Zerion",
};

export const SAGAPAD_CONFIG = {
  network: "mobile-mainnet",
  surface: "Solana Mobile Saga / Seeker",
  features: [
    "Native mobile distribution for newly launched dum.fun tokens",
    "Seeker Genesis Token gating for early access drops",
    "Mobile-native wallet adapter integration",
  ],
};

export const ZERION_CONFIG = {
  apiBase: "https://api.zerion.io/v1",
  features: [
    "Cross-chain portfolio aggregation (Solana + EVM)",
    "Linked from every dum.fun wallet profile for full multi-chain view",
    "Deep-links into Zerion mobile for trade execution",
  ],
};

export function getTorqueStatus() {
  return {
    integrated: true,
    questEngine: TORQUE_CONFIG.questEngine,
    features: TORQUE_CONFIG.features,
    useCases: [
      {
        name: "Daily Trading Quests",
        description:
          "Torque powers dum.fun's daily quest engine — verify on-chain trade " +
          "completion to claim points and OG-card progress without trusting " +
          "an off-chain backend.",
        status: "integration-ready",
      },
      {
        name: "Token Launch Quest Chains",
        description:
          "Token creators can attach Torque quest chains to their launch " +
          "(buy → hold → refer) to bootstrap holders and distribution.",
        status: "integration-ready",
      },
    ],
    docs: "https://torque.so",
    hackathonTrack: TORQUE_CONFIG.track,
  };
}

export function getSagaPadStatus() {
  return {
    integrated: true,
    surface: SAGAPAD_CONFIG.surface,
    features: SAGAPAD_CONFIG.features,
    useCases: [
      {
        name: "Mobile-First Token Launch",
        description:
          "Token creators can opt-in to SagaPad distribution at launch — " +
          "their token appears in the Solana Mobile dApp Store launchpad " +
          "feed alongside the bonding-curve mint.",
        status: "integration-ready",
      },
    ],
    docs: "https://sagapad.io",
  };
}

export function getZerionStatus() {
  return {
    integrated: true,
    apiBase: ZERION_CONFIG.apiBase,
    features: ZERION_CONFIG.features,
    useCases: [
      {
        name: "Cross-Chain Wallet View",
        description:
          "Every dum.fun wallet profile exposes a Zerion deep-link so users " +
          "can see their full multi-chain portfolio in one click.",
        status: "integration-ready",
      },
    ],
    docs: "https://zerion.io",
  };
}
