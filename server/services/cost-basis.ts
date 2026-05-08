import { db } from "../db";
import { activityFeed } from "@shared/schema";
import { and, eq, inArray, or, desc } from "drizzle-orm";

export interface CostBasis {
  // Weighted-average buy price in SOL per token (across remaining lots, FIFO).
  avgBuyPriceSol: number | null;
  // Tokens currently considered "held from buys" (raw tokens, FIFO basis).
  // May differ from on-chain balance if user received tokens off-platform.
  basisTokens: number;
  // Total realized PnL in SOL across closed lots.
  realizedPnlSol: number;
  // Number of buy + sell trades counted.
  tradeCount: number;
}

interface ActivityRow {
  activityType: string;
  amount: string | null;
  metadata: string | null;
  createdAt: Date;
}

interface Lot {
  tokensRemaining: number;
  pricePerToken: number;
}

function parseMeta(raw: string | null): { tokenDelta?: number; solDelta?: number } {
  if (!raw) return {};
  try {
    const m = JSON.parse(raw);
    return {
      tokenDelta: typeof m?.tokenDelta === "number" ? m.tokenDelta : undefined,
      solDelta: typeof m?.solDelta === "number" ? m.solDelta : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Compute weighted-average cost basis from on-chain-derived activityFeed
 * rows for a wallet + mint. Uses FIFO when sells reduce earlier lots so
 * the avg price reflects what's actually still held.
 *
 * Returns null fields when there are no buy events (e.g. token was airdropped
 * or bought off-platform) so the UI can show "no cost basis" instead of $0.
 */
export function computeCostBasisFromActivity(rows: ActivityRow[]): CostBasis {
  // Sort oldest first.
  const sorted = rows
    .filter((r) => r.activityType === "buy" || r.activityType === "sell")
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const lots: Lot[] = [];
  let realized = 0;

  for (const r of sorted) {
    const meta = parseMeta(r.metadata);
    const tokenDelta = meta.tokenDelta;
    const solDelta = meta.solDelta;
    const amt = Number(r.amount) || 0;

    if (r.activityType === "buy") {
      // tokenDelta > 0 (tokens received), solDelta < 0 (SOL paid).
      const tokens = tokenDelta != null && tokenDelta > 0
        ? tokenDelta
        : 0;
      const solSpent = solDelta != null
        ? Math.abs(solDelta)
        : amt; // amount field stores abs(solDelta) for buys
      if (tokens > 0 && solSpent > 0) {
        lots.push({ tokensRemaining: tokens, pricePerToken: solSpent / tokens });
      }
    } else {
      // sell: tokenDelta < 0, solDelta > 0.
      let tokensSold = tokenDelta != null && tokenDelta < 0
        ? -tokenDelta
        : amt; // amount field stores abs(tokenDelta) for sells
      const solReceived = solDelta != null && solDelta > 0
        ? solDelta
        : 0;
      if (tokensSold <= 0) continue;
      const proceedsPerToken = solReceived > 0 ? solReceived / tokensSold : 0;
      while (tokensSold > 1e-9 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(lot.tokensRemaining, tokensSold);
        if (proceedsPerToken > 0) {
          realized += (proceedsPerToken - lot.pricePerToken) * take;
        }
        lot.tokensRemaining -= take;
        tokensSold -= take;
        if (lot.tokensRemaining <= 1e-9) lots.shift();
      }
      // If tokensSold > 0 here, the user sold more than recorded buys (basis
      // unknown - tokens came from elsewhere). We just drop the excess.
    }
  }

  const basisTokens = lots.reduce((s, l) => s + l.tokensRemaining, 0);
  const basisCostSol = lots.reduce((s, l) => s + l.tokensRemaining * l.pricePerToken, 0);
  const avgBuyPriceSol = basisTokens > 1e-9 ? basisCostSol / basisTokens : null;

  return {
    avgBuyPriceSol,
    basisTokens,
    realizedPnlSol: realized,
    tradeCount: sorted.length,
  };
}

/**
 * Batch-fetch buy/sell activity for a wallet across many mints in one query
 * to avoid N+1. Returns a map from mint -> CostBasis.
 */
export async function getCostBasisForWalletMints(
  walletAddress: string,
  mints: string[],
): Promise<Map<string, CostBasis>> {
  const out = new Map<string, CostBasis>();
  if (mints.length === 0) return out;

  const rows = await db
    .select({
      tokenMint: activityFeed.tokenMint,
      activityType: activityFeed.activityType,
      amount: activityFeed.amount,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
    })
    .from(activityFeed)
    .where(
      and(
        eq(activityFeed.walletAddress, walletAddress),
        inArray(activityFeed.tokenMint, mints),
        or(eq(activityFeed.activityType, "buy"), eq(activityFeed.activityType, "sell")),
      ),
    )
    .orderBy(desc(activityFeed.createdAt));

  const byMint = new Map<string, ActivityRow[]>();
  for (const r of rows) {
    if (!r.tokenMint) continue;
    if (!byMint.has(r.tokenMint)) byMint.set(r.tokenMint, []);
    byMint.get(r.tokenMint)!.push({
      activityType: r.activityType,
      amount: r.amount,
      metadata: r.metadata,
      createdAt: r.createdAt,
    });
  }

  for (const mint of mints) {
    out.set(mint, computeCostBasisFromActivity(byMint.get(mint) || []));
  }
  return out;
}

/**
 * Recent trade history for a wallet, joined with token name/symbol/image.
 * Returns oldest-first false (newest first).
 */
export async function getTradeHistoryForWallet(
  walletAddress: string,
  limit: number = 100,
): Promise<{
  id: string;
  tokenMint: string;
  side: "buy" | "sell";
  amountSol: number;
  amountTokens: number;
  pricePerToken: number | null;
  signature: string | null;
  createdAt: string;
}[]> {
  const rows = await db
    .select({
      id: activityFeed.id,
      tokenMint: activityFeed.tokenMint,
      activityType: activityFeed.activityType,
      amount: activityFeed.amount,
      metadata: activityFeed.metadata,
      createdAt: activityFeed.createdAt,
    })
    .from(activityFeed)
    .where(
      and(
        eq(activityFeed.walletAddress, walletAddress),
        or(eq(activityFeed.activityType, "buy"), eq(activityFeed.activityType, "sell")),
      ),
    )
    .orderBy(desc(activityFeed.createdAt))
    .limit(limit);

  return rows
    .filter((r) => r.tokenMint)
    .map((r) => {
      const meta = parseMeta(r.metadata);
      const sig = (() => {
        try { return r.metadata ? (JSON.parse(r.metadata)?.signature ?? null) : null; }
        catch { return null; }
      })();
      const amt = Number(r.amount) || 0;
      const isBuy = r.activityType === "buy";
      const tokens = meta.tokenDelta != null
        ? Math.abs(meta.tokenDelta)
        : (isBuy ? 0 : amt);
      const sol = meta.solDelta != null
        ? Math.abs(meta.solDelta)
        : (isBuy ? amt : 0);
      const price = tokens > 0 && sol > 0 ? sol / tokens : null;
      return {
        id: r.id,
        tokenMint: r.tokenMint!,
        side: isBuy ? "buy" : "sell" as "buy" | "sell",
        amountSol: sol,
        amountTokens: tokens,
        pricePerToken: price,
        signature: sig,
        createdAt: r.createdAt.toISOString(),
      };
    });
}
