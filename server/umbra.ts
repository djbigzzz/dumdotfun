/**
 * Umbra Privacy SDK Integration — dum.fun × Umbra Protocol
 *
 * Umbra is the privacy infrastructure layer for Solana — encrypted token
 * balances (ETAs) and a UTXO-based shielded transfer system. This module is
 * the public surface for the Umbra integration:
 *
 *   - getUmbraStatus()   — live SDK + payout status (hackathon endpoint)
 *   - getUmbraPools()    — supported shielded mints
 *   - getUmbraQuote()    — quote a private payout (lamports/mint/flow)
 *   - createPayoutUtxo() — server-side ReceiverClaimableUTXO creation
 *   - scanUmbraUtxos()   — proxy to the Umbra indexer
 *
 * SDK:    @umbra-privacy/sdk + @umbra-privacy/web-zk-prover
 * Track:  Umbra $10K Privacy Track — Colosseum Frontier 2026
 */

import {
  getUmbraPayoutsStatus,
  createReceiverClaimableUtxo,
  UMBRA_PROGRAM_ID,
  type UmbraUtxoCreationResult,
} from "./services/umbra-payouts";
import { db } from "./db";
import { marketPayouts } from "../shared/schema";
import { sql, isNotNull } from "drizzle-orm";

const DEVNET_INDEXER_URL = "https://utxo-indexer.api-devnet.umbraprivacy.com";
const WSOL_MINT = "So11111111111111111111111111111111111111112";
const LAMPORTS_PER_SOL = 1_000_000_000;

export interface UmbraPool {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface UmbraQuote {
  recipient: string;
  amountLamports: string;
  mint: string;
  programId: string;
  flow: string;
  estimatedSteps: number;
}

export interface UmbraStatus {
  integrated: true;
  sdkVersion: string;
  network: "devnet";
  programId: string;
  indexer: string;
  platformAddress: string | null;
  platformRegistered: boolean;
  privateMint: string;
  supportedTokens: string[];
  live: boolean;
  status: "live" | "integration-ready";
  umbraPayoutCount: number;
  description: string;
  features: string[];
  hackathonTrack: string;
  docs: string;
}

export function getUmbraPools(): UmbraPool[] {
  return [
    { mint: WSOL_MINT, symbol: "wSOL", name: "Wrapped SOL", decimals: 9 },
  ];
}

export function getUmbraQuote(args: { recipientWallet: string; amountSol: number }): UmbraQuote {
  const lamports = BigInt(Math.floor(args.amountSol * LAMPORTS_PER_SOL));
  return {
    recipient: args.recipientWallet,
    amountLamports: lamports.toString(),
    mint: WSOL_MINT,
    programId: UMBRA_PROGRAM_ID,
    flow: "PublicBalance → ReceiverClaimableUTXO → EncryptedBalance",
    estimatedSteps: 3,
  };
}

export async function createPayoutUtxo(
  recipientWallet: string,
  amountSol: number,
): Promise<UmbraUtxoCreationResult> {
  const lamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
  return createReceiverClaimableUtxo(recipientWallet, lamports);
}

export async function getUmbraStatus(): Promise<UmbraStatus> {
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
    sdkVersion: payoutsStatus.sdkPackage,
    network: "devnet",
    programId: payoutsStatus.programId,
    indexer: payoutsStatus.indexer,
    platformAddress: payoutsStatus.platformAddress,
    platformRegistered: payoutsStatus.platformRegistered,
    privateMint: payoutsStatus.privateMint,
    supportedTokens: payoutsStatus.supportedTokens,
    live: isLive,
    status: isLive ? "live" : "integration-ready",
    umbraPayoutCount,
    description: payoutsStatus.description,
    features: [
      "Receiver-claimable UTXO creation via getPublicBalanceToReceiverClaimableUtxoCreatorFunction",
      "Server-side ZK proof generation via @umbra-privacy/web-zk-prover (CDN assets)",
      "Browser-side claim into encrypted balance via getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction",
      "Per-payout viewing key for selective auditor disclosure",
      "Idempotent payout records: umbraRef + umbraQueueSig stored per payout",
      "Claimable UTXO scan endpoint: GET /api/umbra/scan-utxos/:wallet",
      "Winner-initiated UTXO creation: POST /api/umbra/create-payout-utxo",
    ],
    hackathonTrack: "Umbra $10K Privacy Track — Colosseum Frontier 2026",
    docs: "https://sdk.umbraprivacy.com",
  };
}

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
