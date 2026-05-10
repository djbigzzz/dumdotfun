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
const ACTIVE_REFRESH_LIMIT = 12;
const REFRESH_CONCURRENCY = 2;

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

async function refreshOneGraduated(mint: string): Promise<boolean> {
  try {
    const { getPoolStats } = await import("./raydium-swap");
    const pool = await getPoolStats(mint);
    if (!pool || !(pool.priceTokenInSol > 0)) return false;

    const [row] = await db
      .select({ totalSupply: tokensTable.totalSupply })
      .from(tokensTable)
      .where(eq(tokensTable.mint, mint))
      .limit(1);
    // tokens.totalSupply is stored in UI units (e.g. 1,000,000,000), not raw
    // base units, so no decimals adjustment is needed here.
    const totalSupply = Number(row?.totalSupply) || 1_000_000_000;
    const priceInSol = pool.priceTokenInSol;
    const marketCapSol = priceInSol * totalSupply;

    await db
      .update(tokensTable)
      .set({
        priceInSol: priceInSol.toFixed(12),
        marketCapSol: marketCapSol.toFixed(9),
        bondingCurveProgress: "100.000",
        isGraduated: true,
        updatedAt: new Date(),
      })
      .where(eq(tokensTable.mint, mint));
    return true;
  } catch {
    return false;
  }
}

async function refreshActiveTokenStats(): Promise<number> {
  // Stale-first ordering so every active token eventually gets refreshed,
  // even when the active set is bigger than ACTIVE_REFRESH_LIMIT. NULLs
  // first to prioritise rows that were never refreshed.
  const active = await db
    .select({
      mint: tokensTable.mint,
      isGraduated: tokensTable.isGraduated,
      graduationStatus: tokensTable.graduationStatus,
      raydiumPoolId: tokensTable.raydiumPoolId,
    })
    .from(tokensTable)
    .where(
      and(
        eq(tokensTable.deploymentStatus, "deployed"),
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
      // Only use the Raydium path when the pool actually exists; otherwise
      // (graduation flag flipped on-chain but migration not yet completed)
      // fall back to the bonding-curve refresh so stats keep ticking.
      const useRaydium =
        next.isGraduated &&
        next.graduationStatus === "completed" &&
        !!next.raydiumPoolId;
      let ok = useRaydium ? await refreshOneGraduated(next.mint) : false;
      if (!ok) ok = await refreshOne(next.mint);
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
    const { recoverOrphanedToken, isPlaceholderRow } = await import("./orphan-recovery");
    for (const token of pending) {
      try {
        const mintPubkey = new PublicKey(token.mint);
        const accountInfo = await connection.getAccountInfo(mintPubkey);

        if (accountInfo && accountInfo.data.length > 0) {
          // Mint account exists on-chain. Before publishing the token to the
          // public Explore feed we also require real Metaplex metadata, so
          // we don't show garbage rows like "Token 1ph6 / $1PH6 / no image".
          // For placeholder rows we run orphan-recovery, which upgrades the
          // row in place once metadata becomes readable; if metadata still
          // isn't there, leave the row as pending and check again next cycle.
          if (isPlaceholderRow(token, token.mint)) {
            const upgraded = await recoverOrphanedToken(token.mint);
            if (!upgraded || isPlaceholderRow(upgraded, token.mint)) {
              result.stillPending.push(token.mint);
              continue;
            }
          }
          await db
            .update(tokensTable)
            .set({ deploymentStatus: "deployed", updatedAt: new Date() })
            .where(eq(tokensTable.mint, token.mint));
          // Promotion to "deployed" must also seed the default "Will it
          // rug?" market — otherwise tokens that arrived via the reconciler
          // path (devnet-confirm never succeeded) show up on Explore with
          // "No predictions yet" forever.
          try {
            const { ensureDefaultRugMarket } = await import("./default-market");
            await ensureDefaultRugMarket({
              mint: token.mint,
              name: token.name,
              symbol: token.symbol,
              imageUri: token.imageUri,
              creatorAddress: token.creatorAddress,
            });
          } catch (e) {
            console.error(
              `[TokenReconciler] default market seed failed for ${token.mint}:`,
              (e as any)?.message || e,
            );
          }
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

  // Backfill default "Will it rug?" markets for any deployed token that
  // doesn't already have one. This fixes historic tokens that were
  // promoted before the auto-create wiring landed (e.g. tokens whose
  // /devnet-confirm leg failed the old fee check) and shows up on Explore
  // as "No predictions yet". Bounded per cycle to keep the loop cheap.
  try {
    await backfillMissingDefaultMarkets();
  } catch (e) {
    console.error(
      "[TokenReconciler] backfill default markets failed:",
      (e as any)?.message || e,
    );
  }

  return result;
}

const BACKFILL_LIMIT = 25;

async function backfillMissingDefaultMarkets(): Promise<void> {
  const candidates = await db
    .select({
      mint: tokensTable.mint,
      name: tokensTable.name,
      symbol: tokensTable.symbol,
      imageUri: tokensTable.imageUri,
      creatorAddress: tokensTable.creatorAddress,
    })
    .from(tokensTable)
    .where(
      and(
        eq(tokensTable.deploymentStatus, "deployed"),
        or(
          isNull(tokensTable.graduationStatus),
          ne(tokensTable.graduationStatus, "broken"),
        ),
      ),
    )
    .orderBy(sql`${tokensTable.createdAt} DESC NULLS LAST`)
    .limit(BACKFILL_LIMIT);

  if (candidates.length === 0) return;
  const { ensureDefaultRugMarket } = await import("./default-market");
  for (const t of candidates) {
    await ensureDefaultRugMarket({
      mint: t.mint,
      name: t.name,
      symbol: t.symbol,
      imageUri: t.imageUri,
      creatorAddress: t.creatorAddress,
    });
  }
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
