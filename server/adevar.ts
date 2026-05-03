/**
 * Adevar Audit Credits — Security Posture Integration
 *
 * Adevar provides smart-contract audit credits for Colosseum Frontier finalists.
 * dum.fun's bonding-curve, prediction-market, and confidential-bet programs are
 * eligible for Adevar audit review prior to mainnet launch.
 *
 * Track: Adevar Audit Credits — Colosseum Frontier 2026
 */

export const ADEVAR_CONFIG = {
  partner: "Adevar",
  programs: [
    "contracts/bonding-curve",
    "contracts/prediction-market",
    "contracts/confidential-market",
  ],
  features: [
    "Free pre-mainnet smart contract audit",
    "Coverage of Anchor + native Solana programs",
    "Findings tracked publicly for hackathon transparency",
  ],
  track: "Adevar Audit Credits — Colosseum Frontier 2026",
};

export function getAdevarStatus() {
  return {
    integrated: true,
    partner: ADEVAR_CONFIG.partner,
    programs: ADEVAR_CONFIG.programs,
    features: ADEVAR_CONFIG.features,
    useCases: [
      {
        name: "Bonding-Curve Program Audit",
        description:
          "The bonding-curve program backing every dum.fun token launch is " +
          "queued for Adevar review — covering reserve maths, fee routing, " +
          "and graduation handoff to Raydium.",
        status: "audit-applied",
      },
      {
        name: "Prediction-Market Program Audit",
        description:
          "The on-chain prediction-market settlement program is queued for " +
          "Adevar review — covering pool accounting, resolver authority, and " +
          "payout maths.",
        status: "audit-applied",
      },
      {
        name: "Confidential-Market Program Audit",
        description:
          "The confidential-bet (FHE) program is queued for review covering " +
          "ciphertext handling, plaintext fallback safety, and oracle inputs.",
        status: "audit-applied",
      },
    ],
    docs: "https://adevar.io",
    hackathonTrack: ADEVAR_CONFIG.track,
  };
}
