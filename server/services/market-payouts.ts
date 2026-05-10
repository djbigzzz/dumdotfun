import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { db } from "../db";
import { marketPayouts } from "../../shared/schema";
import { storage } from "../storage";
import { eq, sql } from "drizzle-orm";
import { getConnection, getPublicConnection } from "../helius-rpc";
import bs58 from "bs58";

// Per-call defense in depth: never send more than this in a single payout.
// A real winner of a huge market could exceed this; if so, the operator
// reviews manually.
const MAX_PAYOUT_LAMPORTS = 50 * LAMPORTS_PER_SOL;
const MAX_ATTEMPTS = 3;

export interface PayoutRow {
  positionId: string;
  marketId: string;
  walletAddress: string;
  amountLamports: bigint;
}

function parseSecretKey(raw: string, name: string): Keypair {
  const t = raw.trim();
  let bytes: Uint8Array;
  if (t.startsWith("[")) bytes = Uint8Array.from(JSON.parse(t));
  else if (t.includes(",")) bytes = new Uint8Array(t.split(",").map(Number));
  else bytes = new Uint8Array(Buffer.from(t, "base64"));
  if (bytes.length !== 64) {
    throw new Error(`${name} has wrong length: ${bytes.length}, expected 64`);
  }
  return Keypair.fromSecretKey(bytes);
}

// Cache parsed keypairs by their public address so we can quickly find the
// right signer for a given market.poolWallet.
const keypairCacheByAddress = new Map<string, Keypair>();

function loadKeypairsFromEnv(): void {
  if (keypairCacheByAddress.size > 0) return;
  const platform = process.env.PLATFORM_AUTHORITY_SECRET_KEY;
  if (platform) {
    try {
      const kp = parseSecretKey(platform, "PLATFORM_AUTHORITY_SECRET_KEY");
      keypairCacheByAddress.set(kp.publicKey.toBase58(), kp);
    } catch (e) { console.error("[Payouts] Failed to load PLATFORM_AUTHORITY_SECRET_KEY:", e); }
  }
  const pool = process.env.BETTING_POOL_AUTHORITY_SECRET_KEY;
  if (pool) {
    try {
      const kp = parseSecretKey(pool, "BETTING_POOL_AUTHORITY_SECRET_KEY");
      keypairCacheByAddress.set(kp.publicKey.toBase58(), kp);
    } catch (e) { console.error("[Payouts] Failed to load BETTING_POOL_AUTHORITY_SECRET_KEY:", e); }
  }
}

function getKeypairFor(walletAddress: string): Keypair {
  loadKeypairsFromEnv();
  const kp = keypairCacheByAddress.get(walletAddress);
  if (!kp) {
    const available: string[] = [];
    keypairCacheByAddress.forEach((_v, k) => available.push(k));
    throw new Error(`No secret key configured for pool wallet ${walletAddress}. Available: ${available.join(", ")}`);
  }
  return kp;
}

function getConn(): Connection {
  try { return getConnection(); } catch { return getPublicConnection(); }
}

// Compute the lamport payout each winning position is owed for a given market.
// Mirrors the parimutuel math used in /api/markets/:id/resolve. Stored
// position.amount and market.yesPool/noPool are NET amounts (post platform
// fee), so totalPool here is what the platform actually owes back to winners.
export async function computePayoutsForMarket(marketId: string, dryRun = false): Promise<{
  marketId: string;
  outcome: string | null;
  totalPoolSol: number;
  rows: PayoutRow[];
  skipped: string;
} | null> {
  const market = await storage.getMarket(marketId);
  if (!market) return null;
  if (market.status !== "resolved" || !market.outcome) {
    return { marketId, outcome: market.outcome ?? null, totalPoolSol: 0, rows: [], skipped: "not resolved" };
  }
  const positions = await storage.getPositionsByMarket(marketId);
  const winning = positions.filter(p => p.side === market.outcome);
  if (winning.length === 0) {
    return { marketId, outcome: market.outcome, totalPoolSol: 0, rows: [], skipped: "no winners" };
  }
  const totalPool = Number(market.yesPool) + Number(market.noPool);
  const totalWinningShares = winning.reduce((sum, p) => sum + Number(p.shares), 0);
  if (totalWinningShares <= 0) {
    return { marketId, outcome: market.outcome, totalPoolSol: totalPool, rows: [], skipped: "zero winning shares" };
  }
  const rows: PayoutRow[] = [];
  for (const p of winning) {
    if (!p.walletAddress) continue;
    const ratio = Number(p.shares) / totalWinningShares;
    const payoutSol = ratio * totalPool;
    // Round to lamports, never pay more than the position would owe.
    const lamports = BigInt(Math.floor(payoutSol * LAMPORTS_PER_SOL));
    if (lamports <= BigInt(0)) continue;
    rows.push({
      positionId: p.id,
      marketId,
      walletAddress: p.walletAddress,
      amountLamports: lamports,
    });
  }
  return { marketId, outcome: market.outcome, totalPoolSol: totalPool, rows, skipped: dryRun ? "dry-run" : "" };
}

// Insert pending payout rows for every winning position. ON CONFLICT on the
// unique position_id makes this safe to call repeatedly across replicas, the
// auto-resolver, the manual /resolve route, and the backfill script - the
// first caller wins, every subsequent insert is a no-op.
async function insertPendingPayouts(rows: PayoutRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const values = rows.map(r => ({
    positionId: r.positionId,
    marketId: r.marketId,
    walletAddress: r.walletAddress,
    amountLamports: r.amountLamports.toString(),
    status: "pending" as const,
  }));
  const inserted = await db.insert(marketPayouts).values(values)
    .onConflictDoNothing({ target: marketPayouts.positionId })
    .returning({ id: marketPayouts.id });
  return inserted.length;
}

// Send one pending payout on chain with crash-safe semantics.
//
// To prevent double-payment on retry, we follow this 4-step state machine:
//   1. If the row already has a signature from a prior attempt, FIRST query
//      the chain. If that sig is on chain (success or program error), we
//      treat it as authoritative and never rebroadcast.
//   2. Build, sign, and PERSIST the signature to the row BEFORE broadcasting.
//      A crash between persist and broadcast leaves a dead-but-recoverable
//      row: the next retry will see the sig, query chain (step 1), find it
//      missing, and the blockhash will be expired so a fresh sig is built.
//   3. Broadcast and confirm.
//   4. On success update status='sent'. On failure, leave the persisted sig
//      on the row so step 1 can deduplicate on the next retry.
async function sendOnePayout(
  conn: Connection,
  authority: Keypair,
  payoutId: string,
  walletAddress: string,
  amountLamports: bigint,
  existingSig: string | null,
  attempts: number,
): Promise<{ ok: true; signature: string } | { ok: false; error: string; signature?: string }> {
  try {
    if (amountLamports > BigInt(MAX_PAYOUT_LAMPORTS)) {
      return { ok: false, error: `payout exceeds MAX_PAYOUT_LAMPORTS (${MAX_PAYOUT_LAMPORTS})` };
    }

    // STEP 1: If we attempted this payout before, check the chain for the
    // prior signature so we never double-pay. We treat ANY non-null status
    // with err===null as authoritative (processed/confirmed/finalized all
    // mean the tx landed and funds moved).
    if (existingSig) {
      let chainStatus: any;
      try {
        chainStatus = await conn.getSignatureStatus(existingSig, { searchTransactionHistory: true });
      } catch (e: any) {
        // RPC error - indeterminate, do not rebroadcast. Leave row pending.
        return { ok: false, error: `chain status query failed for prior sig: ${e?.message ?? e}`, signature: existingSig };
      }
      const v = chainStatus?.value;
      if (v) {
        if (v.err === null || v.err === undefined) {
          // Tx landed (processed, confirmed, or finalized) and recipient
          // received funds - DO NOT rebroadcast.
          return { ok: true, signature: existingSig };
        }
        // Tx landed but errored on chain - recipient never received funds,
        // so it's safe to build a fresh tx below (signature will be
        // overwritten in Step 2).
        console.log(`[Payouts] Prior sig ${existingSig} landed with err, retrying fresh.`);
      } else {
        // Chain has no record. Solana blockhash validity is ~150 slots (~60s).
        // The reaper holds a row in 'processing' for at least 120s before
        // reverting to 'pending', so by the time we see attempts >= 2 the
        // prior tx's blockhash is GUARANTEED expired and the prior sig
        // CANNOT land on chain anymore. It is then safe to clear the old
        // sig and build a fresh tx. On the very first retry (attempts < 2)
        // we conservatively wait one more cycle in case the prior broadcast
        // is still propagating.
        if (attempts < 2) {
          return { ok: false, error: "prior sig not yet on chain - waiting one cycle for blockhash to expire", signature: existingSig };
        }
        console.log(`[Payouts] Prior sig ${existingSig} absent from chain after ${attempts} attempts (>120s); blockhash expired, clearing and retrying fresh.`);
      }
    }

    const recipient = new PublicKey(walletAddress);
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: recipient,
      lamports: Number(amountLamports),
    }));
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = authority.publicKey;
    tx.sign(authority);
    const sig = bs58.encode(tx.signature!);

    // STEP 2: Persist signature BEFORE broadcasting. If we crash between
    // here and the broadcast, the next retry's chain query will find no
    // such sig (since we never broadcast it AND blockhash will be expired)
    // and safely build a new tx.
    await db.update(marketPayouts)
      .set({ signature: sig, updatedAt: new Date() })
      .where(eq(marketPayouts.id, payoutId));

    // STEP 3: Broadcast and confirm.
    await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
    const conf = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    if (conf.value.err) {
      return { ok: false, error: `confirm error: ${JSON.stringify(conf.value.err)}`, signature: sig };
    }
    return { ok: true, signature: sig };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// Atomically claim a batch of pending payouts for processing across replicas.
// FOR UPDATE SKIP LOCKED ensures two replicas can't grab the same row. We
// also pull the source pool wallet (joined from prediction_markets) so the
// caller knows which keypair to sign with.
async function claimPendingPayouts(limit: number): Promise<Array<{
  id: string; walletAddress: string; amountLamports: string; attempts: number; poolWallet: string; signature: string | null;
}>> {
  // EXCLUSIVE CLAIM: transition pending -> processing in the same SQL
  // statement that increments attempts. Other workers filter on
  // status='pending' so they cannot re-claim a row currently being sent.
  // On transient failure we revert status back to 'pending'; on terminal
  // failure we set 'failed'; on success we set 'sent'. Stuck 'processing'
  // rows after a crash get reset by reapStuckProcessingPayouts() periodically.
  //
  // TIME GATE: rows that already have a persisted signature can only be
  // re-claimed after >90s have passed since their last update. This
  // GUARANTEES the prior tx's blockhash (~60s validity) has expired, so
  // when sendOnePayout chooses to rebuild a fresh tx it cannot race with a
  // late-landing prior broadcast. First-attempt rows (no sig yet) bypass
  // this gate so they're processed immediately.
  const result: any = await db.execute(sql`
    WITH claimed AS (
      SELECT id FROM market_payouts
      WHERE status = 'pending'
        AND attempts < ${MAX_ATTEMPTS}
        AND (signature IS NULL OR updated_at < now() - interval '90 seconds')
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE market_payouts mp
    SET attempts = mp.attempts + 1, status = 'processing', updated_at = now()
    FROM claimed
    WHERE mp.id = claimed.id
    RETURNING
      mp.id,
      mp.wallet_address AS "walletAddress",
      mp.amount_lamports::text AS "amountLamports",
      mp.attempts,
      mp.signature,
      (SELECT pool_wallet FROM prediction_markets WHERE id = mp.market_id) AS "poolWallet"
  `);
  return result.rows as any[];
}

// Reset rows stuck in 'processing' (e.g. worker crashed mid-send) back to
// 'pending' so they can be retried. Safe to call at startup; the chain
// double-pay guard in sendOnePayout uses the persisted signature to avoid
// duplicate broadcasts.
export async function reapStuckProcessingPayouts(olderThanSeconds = 120): Promise<number> {
  const result: any = await db.execute(sql`
    UPDATE market_payouts
    SET status = 'pending', updated_at = now()
    WHERE status = 'processing'
      AND updated_at < now() - (${olderThanSeconds}::int * interval '1 second')
    RETURNING id
  `);
  const n = (result.rows as any[]).length;
  if (n > 0) console.log(`[Payouts] Reaped ${n} stuck 'processing' rows back to 'pending'`);
  return n;
}

// Drain all currently-pending payouts. Used both by the auto-resolver hook
// (right after a market resolves) and by the standalone backfill script.
// Returns counts so callers can log/report.
export async function processPendingPayouts(maxBatch = 50): Promise<{
  attempted: number; sent: number; failed: number; details: Array<{ id: string; ok: boolean; signature?: string; error?: string; }>;
}> {
  const conn = getConn();
  const claimed = await claimPendingPayouts(maxBatch);
  let sent = 0, failed = 0;
  const details: Array<any> = [];
  for (const row of claimed) {
    const amt = BigInt(row.amountLamports);
    let authority: Keypair;
    try {
      authority = getKeypairFor(row.poolWallet);
    } catch (e: any) {
      // No key for this pool wallet - revert from 'processing' to either
      // 'pending' (more retries available) or 'failed' (terminal).
      // row.attempts was already incremented by claimPendingPayouts, so we
      // compare against MAX_ATTEMPTS directly (no +1).
      await db.update(marketPayouts)
        .set({ status: row.attempts >= MAX_ATTEMPTS ? "failed" : "pending", error: e.message, updatedAt: new Date() })
        .where(eq(marketPayouts.id, row.id));
      failed++;
      details.push({ id: row.id, ok: false, error: e.message });
      console.error(`[Payouts] No signing key for pool wallet ${row.poolWallet}: ${e.message}`);
      continue;
    }
    const result = await sendOnePayout(conn, authority, row.id, row.walletAddress, amt, row.signature, row.attempts);
    if (result.ok) {
      // After SOL payout lands, attempt an additional Umbra private payout.
      // This is additive privacy layering — failure does not affect the winner.
      let umbraRef: string | null = null;
      let umbraQueueSig: string | null = null;
      try {
        const { sendUmbraPrivatePayout } = await import("./umbra-payouts");
        const umbraResult = await sendUmbraPrivatePayout(row.walletAddress, amt);
        if (umbraResult.ok) {
          umbraRef = umbraResult.umbraRef ?? null;
          umbraQueueSig = umbraResult.queueSignature ?? null;
        }
      } catch (umbraErr: any) {
        console.warn(`[Payouts] Umbra private payout error (non-fatal): ${umbraErr?.message ?? umbraErr}`);
      }

      await db.update(marketPayouts)
        .set({ status: "sent", signature: result.signature, error: null, umbraRef, umbraQueueSig, updatedAt: new Date() })
        .where(eq(marketPayouts.id, row.id));
      sent++;
      details.push({ id: row.id, ok: true, signature: result.signature, umbraRef: umbraRef ?? undefined });
      console.log(`[Payouts] sent ${(Number(amt) / LAMPORTS_PER_SOL).toFixed(6)} SOL to ${row.walletAddress} sig=${result.signature}${umbraRef ? ` umbra=${umbraRef}` : ""}`);
    } else {
      // row.attempts is post-increment from claimPendingPayouts. After
      // MAX_ATTEMPTS tries we mark terminal failed; otherwise revert to
      // 'pending' so a later cycle can retry.
      const finalStatus = row.attempts >= MAX_ATTEMPTS ? "failed" : "pending";
      await db.update(marketPayouts)
        .set({ status: finalStatus, error: result.error, updatedAt: new Date() })
        .where(eq(marketPayouts.id, row.id));
      failed++;
      details.push({ id: row.id, ok: false, error: result.error });
      console.error(`[Payouts] FAILED payout ${row.id} (attempt ${row.attempts}/${MAX_ATTEMPTS}): ${result.error}`);
    }
    // Brief pause to avoid spamming RPC
    await new Promise(r => setTimeout(r, 250));
  }
  return { attempted: claimed.length, sent, failed, details };
}

// Public entry: insert pending rows for a market, then process them. Hooked
// into both auto-resolver and manual resolve. Idempotent: re-runs are no-ops.
export async function payoutMarket(marketId: string): Promise<{
  inserted: number; sent: number; failed: number; totalPoolSol: number;
}> {
  const computed = await computePayoutsForMarket(marketId);
  if (!computed) return { inserted: 0, sent: 0, failed: 0, totalPoolSol: 0 };
  const inserted = await insertPendingPayouts(computed.rows);
  // Process payouts grouped by pool wallet so each batch uses the correct
  // signing keypair (legacy markets vs new betting-pool markets).
  const result = await processPendingPayouts(500);
  return {
    inserted,
    sent: result.sent,
    failed: result.failed,
    totalPoolSol: computed.totalPoolSol,
  };
}

// Backfill: queue pending payouts for every resolved market that doesn't
// already have payout rows. Safe to run repeatedly.
export async function backfillResolvedMarkets(): Promise<{
  marketsScanned: number; rowsInserted: number; sent: number; failed: number;
}> {
  // Pull every resolved market.
  const allMarkets: any = await db.execute(sql`
    SELECT id FROM prediction_markets WHERE status = 'resolved' AND outcome IS NOT NULL
  `);
  let inserted = 0;
  for (const m of allMarkets.rows as Array<{ id: string }>) {
    const computed = await computePayoutsForMarket(m.id);
    if (!computed || computed.rows.length === 0) continue;
    inserted += await insertPendingPayouts(computed.rows);
  }
  // Drain in a batch.
  const result = await processPendingPayouts(500);
  return {
    marketsScanned: (allMarkets.rows as any[]).length,
    rowsInserted: inserted,
    sent: result.sent,
    failed: result.failed,
  };
}
