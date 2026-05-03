import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../helius-rpc";
import { db } from "../db";
import { tokens as tokensTable } from "@shared/schema";
import { and, eq, lt, or, isNull, ne } from "drizzle-orm";

const VERIFY_AFTER_MS = 5 * 60 * 1000;
const MARK_BROKEN_AFTER_MS = 30 * 60 * 1000;

export interface ReconcileResult {
  scanned: number;
  deployed: string[];
  broken: string[];
  stillPending: string[];
}

export async function reconcilePendingTokens(): Promise<ReconcileResult> {
  const result: ReconcileResult = { scanned: 0, deployed: [], broken: [], stillPending: [] };

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
  if (pending.length === 0) return result;

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
      console.error(`[TokenReconciler] Error checking mint ${token.mint}:`, err);
    }
  }

  return result;
}
