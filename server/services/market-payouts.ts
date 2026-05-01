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

function getAuthorityKeypair(): Keypair {
  const raw = process.env.PLATFORM_AUTHORITY_SECRET_KEY;
  if (!raw) throw new Error("PLATFORM_AUTHORITY_SECRET_KEY not set - payouts disabled");
  const t = raw.trim();
  let bytes: Uint8Array;
  if (t.startsWith("[")) bytes = Uint8Array.from(JSON.parse(t));
  else if (t.includes(",")) bytes = new Uint8Array(t.split(",").map(Number));
  else bytes = new Uint8Array(Buffer.from(t, "base64"));
  if (bytes.length !== 64) {
    throw new Error(`PLATFORM_AUTHORITY_SECRET_KEY has wrong length: ${bytes.length}, expected 64`);
  }
  return Keypair.fromSecretKey(bytes);
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
    if (lamports <= 0n) continue;
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

// Send one pending payout on chain. Wraps the actual transfer + DB update in
// a try/catch so a single failed payout never poisons the batch. We update
// status='sent' AND signature in one statement so concurrent observers can't
// see a 'sent' row without a signature.
async function sendOnePayout(
  conn: Connection,
  authority: Keypair,
  payoutId: string,
  walletAddress: string,
  amountLamports: bigint,
): Promise<{ ok: true; signature: string } | { ok: false; error: string }> {
  try {
    if (amountLamports > BigInt(MAX_PAYOUT_LAMPORTS)) {
      return { ok: false, error: `payout exceeds MAX_PAYOUT_LAMPORTS (${MAX_PAYOUT_LAMPORTS})` };
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
    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
    const conf = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    if (conf.value.err) {
      return { ok: false, error: `confirm error: ${JSON.stringify(conf.value.err)}` };
    }
    return { ok: true, signature: sig };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

// Atomically claim one pending payout for processing across replicas.
// FOR UPDATE SKIP LOCKED ensures two replicas can't grab the same row.
async function claimPendingPayouts(limit: number): Promise<Array<{
  id: string; walletAddress: string; amountLamports: string; attempts: number;
}>> {
  const result: any = await db.execute(sql`
    WITH claimed AS (
      SELECT id FROM market_payouts
      WHERE status = 'pending' AND attempts < ${MAX_ATTEMPTS}
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE market_payouts mp
    SET attempts = mp.attempts + 1, updated_at = now()
    FROM claimed
    WHERE mp.id = claimed.id
    RETURNING mp.id, mp.wallet_address AS "walletAddress", mp.amount_lamports::text AS "amountLamports", mp.attempts
  `);
  return result.rows as any[];
}

// Drain all currently-pending payouts. Used both by the auto-resolver hook
// (right after a market resolves) and by the standalone backfill script.
// Returns counts so callers can log/report.
export async function processPendingPayouts(maxBatch = 50): Promise<{
  attempted: number; sent: number; failed: number; details: Array<{ id: string; ok: boolean; signature?: string; error?: string; }>;
}> {
  const authority = getAuthorityKeypair();
  const conn = getConn();
  const claimed = await claimPendingPayouts(maxBatch);
  let sent = 0, failed = 0;
  const details: Array<any> = [];
  for (const row of claimed) {
    const amt = BigInt(row.amountLamports);
    const result = await sendOnePayout(conn, authority, row.id, row.walletAddress, amt);
    if (result.ok) {
      await db.update(marketPayouts)
        .set({ status: "sent", signature: result.signature, error: null, updatedAt: new Date() })
        .where(eq(marketPayouts.id, row.id));
      sent++;
      details.push({ id: row.id, ok: true, signature: result.signature });
      console.log(`[Payouts] sent ${(Number(amt) / LAMPORTS_PER_SOL).toFixed(6)} SOL to ${row.walletAddress} sig=${result.signature}`);
    } else {
      const finalStatus = row.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending";
      await db.update(marketPayouts)
        .set({ status: finalStatus, error: result.error, updatedAt: new Date() })
        .where(eq(marketPayouts.id, row.id));
      failed++;
      details.push({ id: row.id, ok: false, error: result.error });
      console.error(`[Payouts] FAILED payout ${row.id} (attempt ${row.attempts}): ${result.error}`);
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
  const result = await processPendingPayouts(computed.rows.length || 1);
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
