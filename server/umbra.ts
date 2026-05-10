/**
 * Umbra Privacy SDK Integration — dum.fun × Umbra Protocol
 *
 * Umbra is the privacy infrastructure layer for Solana — encrypted token
 * balances (ETAs) and a mixer that hides the relationship between sender and
 * recipient. This module exposes:
 *   - getUmbraStatus()  — live SDK status for the hackathon endpoint
 *   - scanUmbraUtxos()  — proxy to the Umbra indexer to list claimable UTXOs
 *
 * Private payout logic lives in server/services/umbra-payouts.ts.
 *
 * SDK:    @umbra-privacy/sdk
 * Track:  Umbra $10K Privacy Track — Colosseum Frontier 2026
 */

import { getUmbraPayoutsStatus } from "./services/umbra-payouts";
import { db } from "./db";
import { marketPayouts } from "../shared/schema";
import { sql, isNotNull } from "drizzle-orm";

const DEVNET_INDEXER_URL = "https://utxo-indexer.api-devnet.umbraprivacy.com";

export async function getUmbraStatus() {
  const payoutsStatus = getUmbraPayoutsStatus();

  let umbraPayoutCount = 0;
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(marketPayouts)
      .where(isNotNull(marketPayouts.umbraRef));
    umbraPayoutCount = rows[0]?.count ?? 0;
  } catch {
    umbraPayoutCount = 0;
  }

  const isLive = payoutsStatus.clientInitialised || umbraPayoutCount > 0;

  return {
    integrated: true,
    sdkVersion: "@umbra-privacy/sdk",
    network: "devnet",
    programId: payoutsStatus.programId,
    indexer: payoutsStatus.indexer,
    platformAddress: payoutsStatus.platformAddress,
    platformRegistered: payoutsStatus.platformRegistered,
    privateMint: payoutsStatus.privateMint,
    supportedTokens: payoutsStatus.supportedTokens,
    live: isLive,
    umbraPayoutCount,
    status: isLive ? "live" : "integration-ready",
    description: payoutsStatus.description,
    features: [
      "Private prediction-market payouts via Umbra encrypted balance (ETA)",
      "wSOL direct deposit to winner's shielded balance (no ZK prover required server-side)",
      "Platform authority registered via getUserRegistrationFunction",
      "Idempotent payout records: umbraRef + umbraQueueSig stored per payout",
      "Claimable UTXO scan endpoint: GET /api/umbra/scan-utxos/:wallet",
      "Winner-initiated private payout: POST /api/umbra/create-payout-utxo",
    ],
    hackathonTrack: "Umbra $10K Privacy Track — Colosseum Frontier 2026",
    docs: "https://sdk.umbraprivacy.com",
  };
}

/**
 * Proxy to the Umbra devnet indexer to list claimable UTXOs for a wallet.
 * Returns the raw indexer response so clients can discover UTXOs and build
 * claim transactions using the SDK client-side.
 */
export async function scanUmbraUtxos(walletAddress: string): Promise<unknown> {
  const url = `${DEVNET_INDEXER_URL}/utxos?owner=${encodeURIComponent(walletAddress)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Umbra indexer responded ${res.status} for wallet ${walletAddress}`);
  }
  return res.json();
}
