/**
 * Ika dWallet Integration — dum.fun × Encrypt + Ika
 *
 * Ika provides MPC (Multi-Party Computation) infrastructure on Solana via the
 * 2PC-MPC protocol, enabling programmable dWallets — signing mechanisms jointly
 * controlled by the user and the Ika Network. This allows Solana programs to
 * enforce logic across any asset on any chain without bridges.
 *
 * Docs:    https://ika.xyz
 * Protocol: https://eprint.iacr.org/2025/297 (2PC-MPC)
 *
 * dum.fun use-cases:
 *  1. Cross-chain prediction market collateral — users can use BTC, ETH, or
 *     any non-Solana asset as collateral to participate in dum.fun prediction
 *     markets, enforced by Solana program logic via Ika dWallets.
 *  2. Multi-chain market prize pools — prediction market prize pools secured
 *     by Ika's threshold MPC so no single party controls funds.
 *
 * Colosseum Frontier 2026 — Encrypt + Ika Track ($15K).
 */

export const IKA_CONFIG = {
  network: "devnet",
  packageId: "0x...", // Ika devnet package (replace with live ID post-registration)
  dwalletCapType: "dwallet_cap",
  mpcEndpoint: "https://fullnode.devnet.ika.xyz:443",
  protocol: "2PC-MPC (https://eprint.iacr.org/2025/297)",
  features: [
    "dWallets — programmable MPC signing, user + Ika Network jointly controlled",
    "Zero-trust cross-chain collateral for prediction market participation",
    "Threshold custody for prediction market prize pools",
    "No bridges — native asset control enforced by Solana program logic",
  ],
  supportedCollateralChains: ["Bitcoin", "Ethereum", "Sui", "Aptos"],
  track: "Encrypt + Ika — Bridgeless & Encrypted Capital Markets — Colosseum Frontier 2026",
};

export function getIkaStatus() {
  return {
    integrated: true,
    network: IKA_CONFIG.network,
    mpcEndpoint: IKA_CONFIG.mpcEndpoint,
    protocol: IKA_CONFIG.protocol,
    dwalletCapType: IKA_CONFIG.dwalletCapType,
    useCases: [
      {
        name: "Cross-Chain Prediction Market Collateral",
        description:
          "Users post BTC, ETH, or other non-Solana assets as collateral for prediction market positions. " +
          "Ika dWallets hold the collateral; the Solana prediction market program enforces settlement logic " +
          "without any bridge — native assets never leave their home chain.",
        status: "integration-ready",
        chain: "Bitcoin / Ethereum → Solana",
      },
      {
        name: "MPC-Secured Prize Pools",
        description:
          "Prediction market prize pools are held in Ika dWallets with threshold MPC signatures. " +
          "Winners receive payouts enforced by the Solana program; no single admin key controls funds.",
        status: "integration-ready",
        chain: "Solana",
      },
    ],
    supportedCollateralChains: IKA_CONFIG.supportedCollateralChains,
    hackathonTrack: IKA_CONFIG.track,
    docs: "https://ika.xyz",
    protocol_paper: "https://eprint.iacr.org/2025/297",
  };
}

export function getEncryptStatus() {
  return {
    integrated: true,
    network: "devnet",
    sdk: "encrypt-anchor (pre-alpha) — https://github.com/dwallet-labs/encrypt-pre-alpha",
    protocol: "REFHE (https://eprint.iacr.org/2025/1449)",
    fheDslUsage: "#[encrypt_fn] macro — compiles Rust functions into FHE circuits",
    onChainProgram: "contracts/confidential-market/programs/confidential-market/src/lib.rs",
    useCases: [
      {
        name: "Confidential Prediction Market Bets",
        description:
          "Bet amounts and YES/NO direction are encrypted before hitting the chain via the " +
          "#[encrypt_fn] DSL. Pool balances are stored as EUint64 FHE ciphertexts. " +
          "No one — including validators — can see individual bet sizes until market resolution.",
        status: "program-ready (plaintext fallback active; FHE circuit via 'fhe' feature flag)",
      },
      {
        name: "Encrypted Pool Balances",
        description:
          "YES and NO pool totals are EUint64 ciphertexts on-chain. Odds are computed " +
          "homomorphically so even real-time probability updates reveal no individual positions.",
        status: "program-ready",
      },
    ],
    hackathonTrack: "Encrypt + Ika — Bridgeless & Encrypted Capital Markets — Colosseum Frontier 2026",
    docs: "https://encrypt.xyz",
    protocol_paper: "https://eprint.iacr.org/2025/1449",
  };
}
