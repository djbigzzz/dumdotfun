import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection } from "../helius-rpc";
import { db } from "../db";
import { tokens as tokensTable } from "@shared/schema";
import { and, eq, lt, or, isNull, ne, sql } from "drizzle-orm";
import * as bondingCurve from "../bonding-curve-client";

const VERIFY_AFTER_MS = 5 * 60 * 1000;
const MARK_BROKEN_AFTER_MS = 30 * 60 * 1000;
// How many active tokens to refresh price/mcap/progress for per cycle, and
// how many concurrent RPC calls to make. Helius gets aggressive about 429s
// past ~5 in-flight, so keep this small.
const ACTIVE_REFRESH_LIMIT = 20;
const REFRESH_CONCURRENCY = 3;

export interface ReconcileResult {
  scanned: number;
  deployed: string[];
  broken: string[];
  stillPending: string[];
  refreshed: number;
}

const bnToNum = (val: any): number => {
  if (val == null) return 0;
  return typeof val === "object" && val.toNumber ? val.toNumber() : Number(val);
};

async function refreshOne(mint: string): Promise<boolean> {
  try {
    const mintPubkey = new PublicKey(mint);
    const curve = await bondingCurve.fetchBondingCurveData(mintPubkey);
    if (!curve) return false;

    const priceInSol = bondingCurve.calculatePrice(
      curve.virtualSolReserves,
      curve.virtualTokenReserves,
    );
    const totalSupplyRaw = curve.tokenTotalSupply != null
      ? bnToNum(curve.tokenTotalSupply)
      : 1_000_000_000_000_000;
    const totalSupply = totalSupplyRaw / 1_000_000;
    const marketCapSol = isNaN(totalSupply) ? 0 : priceInSol * totalSupply;
    const realSolReservesNum = bnToNum(curve.realSolReserves);
    const graduationThreshold = 85 * LAMPORTS_PER_SOL;
    const bondingCurveProgress = Math.min(
      100,
      (realSolReservesNum / graduationThreshold) * 100,
    );

    await db
      .update(tokensTable)
      .set({
        priceInSol: priceInSol.toFixed(12),
        marketCapSol: marketCapSol.toFixed(9),
        bondingCurveProgress: bondingCurveProgress.toFixed(3),
        isGraduated: curve.isGraduated,
        updatedAt: new Date(),
      })
      .where(eq(tokensTable.mint, mint));
    return true;
  } catch {
    // 429s and transient errors are expected at scale - the next cycle
    // will pick the row up again.
    return false;
  }
}

async function refreshActiveTokenStats(): Promise<number> {
  // Stale-first ordering so every active token eventually gets refreshed,
  // even when the active set is bigger than ACTIVE_REFRESH_LIMIT. NULLs
  // first to prioritise rows that were never refreshed.
  const active = await db
    .select({ mint: tokensTable.mint })
    .from(tokensTable)
    .where(
      and(
        eq(tokensTable.deploymentStatus, "deployed"),
        eq(tokensTable.isGraduated, false),
        or(
          isNull(tokensTable.graduationStatus),
          ne(tokensTable.graduationStatus, "broken"),
        ),
      ),
    )
    .orderBy(sql`${tokensTable.updatedAt} ASC NULLS FIRST`)
    .limit(ACTIVE_REFRESH_LIMIT);

  let refreshed = 0;
  // Tiny concurrency pool so we don't blow past Helius rate limits.
  const queue = [...active];
  const workers = Array.from({ length: REFRESH_CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      const ok = await refreshOne(next.mint);
      if (ok) refreshed++;
    }
  });
  await Promise.all(workers);
  return refreshed;
}

export async function reconcilePendingTokens(): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    scanned: 0,
    deployed: [],
    broken: [],
    stillPending: [],
    refreshed: 0,
  };

  const verifyCutoff = new Date(Date.now() - VERIFY_AFTER_MS);
  const brokenCutoff = new Date(Date.now() - MARK_BROKEN_AFTER_MS);

  const pending = await db
    .select()
    .from(tokensTable)
    .where(
      and(
        eq(tokensTable.deploymentStatus, "pending"),
        eq(tokensTable.isGraduated, false),
        or(
          isNull(tokensTable.graduationStatus),
          ne(tokensTable.graduationStatus, "broken"),
        ),
        lt(tokensTable.createdAt, verifyCutoff),
      ),
    )
    .limit(50);

  result.scanned = pending.length;

  if (pending.length > 0) {
    const connection = getConnection();
    for (const token of pending) {
      try {
        const mintPubkey = new PublicKey(token.mint);
        const accountInfo = await connection.getAccountInfo(mintPubkey);

        if (accountInfo && accountInfo.data.length > 0) {
          await db
            .update(tokensTable)
            .set({ deploymentStatus: "deployed", updatedAt: new Date() })
            .where(eq(tokensTable.mint, token.mint));
          result.deployed.push(token.mint);
          continue;
        }

        if (token.createdAt && token.createdAt < brokenCutoff) {
          await db
            .update(tokensTable)
            .set({ graduationStatus: "broken", updatedAt: new Date() })
            .where(eq(tokensTable.mint, token.mint));
          result.broken.push(token.mint);
          continue;
        }

        result.stillPending.push(token.mint);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("429") && !msg.includes("Too Many Requests")) {
          console.error(`[TokenReconciler] Error checking mint ${token.mint}:`, err);
        }
      }
    }
  }

  // Always refresh active token price/mcap/progress so the homepage list
  // (which reads cached values) doesn't show stale zeros.
  result.refreshed = await refreshActiveTokenStats();
  return result;
}

// Public helper for opportunistic cache fill from request handlers that
// already fetched fresh curve data (e.g. the token detail endpoint).
// Avoids duplicate RPC calls.
export async function writeBackTokenStats(
  mint: string,
  priceInSol: number,
  marketCapSol: number,
  bondingCurveProgress: number,
  isGraduated: boolean,
): Promise<void> {
  try {
    await db
      .update(tokensTable)
      .set({
        priceInSol: priceInSol.toFixed(12),
        marketCapSol: marketCapSol.toFixed(9),
        bondingCurveProgress: bondingCurveProgress.toFixed(3),
        isGraduated,
        updatedAt: new Date(),
      })
      .where(eq(tokensTable.mint, mint));
  } catch (err) {
    console.error(`[TokenReconciler] writeBack failed for ${mint}:`, err);
  }
}
