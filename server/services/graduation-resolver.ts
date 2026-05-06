import { storage } from "../storage";
import { detectMarketCriteria } from "./token-health";

/**
 * When a token graduates, any open prediction markets that ask "will this
 * token graduate?" have their answer fixed by the on-chain reality. They
 * must close immediately so that no one can keep buying YES (or be tricked
 * into buying NO) on a question whose answer is already public information.
 *
 * This is called from the graduation completion path and from any post-merge
 * sweep that finds a token graduated while open graduation markets exist.
 */
export async function resolveGraduationMarketsForToken(tokenMint: string): Promise<{
  resolved: string[];
  skipped: string[];
}> {
  const out = { resolved: [] as string[], skipped: [] as string[] };

  try {
    const markets = await storage.getMarketsByTokenMint(tokenMint);
    for (const market of markets) {
      if (market.status !== "open") {
        out.skipped.push(market.id);
        continue;
      }

      const stored = (market.survivalCriteria || "").toLowerCase();
      const detected = detectMarketCriteria(market.question || "").toLowerCase();
      const isGraduationMarket =
        stored === "graduated" ||
        (stored === "" || stored === "token_exists") && detected === "graduated";

      if (!isGraduationMarket) {
        out.skipped.push(market.id);
        continue;
      }

      try {
        const transitioned = await storage.resolveMarket(market.id, "yes");
        if (!transitioned) {
          // Another caller already resolved this market - skip downstream
          // work to avoid duplicate quest awards / activity rows.
          out.skipped.push(market.id);
          continue;
        }

        const positions = await storage.getPositionsByMarket(market.id);
        const totalPool = Number(market.yesPool) + Number(market.noPool);

        let payoutSummary: any = { inserted: 0, sent: 0, failed: 0, totalPoolSol: totalPool };
        try {
          const { payoutMarket } = await import("./market-payouts");
          payoutSummary = await payoutMarket(market.id);
        } catch (err) {
          console.error(`[GraduationResolver] Payout failed for ${market.id}:`, err);
        }

        try {
          const { awardQuest } = await import("./points");
          const winners = Array.from(new Set(
            positions
              .filter(p => p.side === "yes")
              .map(p => p.walletAddress)
              .filter((w): w is string => !!w),
          ));
          for (const w of winners) {
            try { await awardQuest(w, "first_win"); } catch {}
          }
        } catch (err) {
          console.error("[GraduationResolver] first_win award failed:", err);
        }

        await storage.addActivity({
          activityType: "market_auto_resolved",
          tokenMint,
          marketId: market.id,
          walletAddress: null,
          amount: totalPool.toString(),
          metadata: JSON.stringify({
            question: market.question,
            outcome: "yes",
            reason: "Token graduated to Raydium - market closed early",
            criteria: stored || detected,
            trigger: "graduation_completed",
            payouts: payoutSummary,
          }),
        });

        out.resolved.push(market.id);
        console.log(`[GraduationResolver] Resolved graduation market ${market.id} as YES (token ${tokenMint} graduated)`);
      } catch (err) {
        console.error(`[GraduationResolver] Failed to resolve ${market.id}:`, err);
        out.skipped.push(market.id);
      }
    }
  } catch (err) {
    console.error(`[GraduationResolver] Lookup failed for ${tokenMint}:`, err);
  }

  return out;
}

/**
 * Pure-function variant of the same predicate, used at bet time to refuse
 * new wagers on a question whose answer is already settled by graduation.
 */
export function isGraduationQuestion(survivalCriteria: string | null | undefined, question: string): boolean {
  const stored = (survivalCriteria || "").toLowerCase();
  if (stored === "graduated") return true;
  if (stored === "" || stored === "token_exists") {
    return detectMarketCriteria(question || "").toLowerCase() === "graduated";
  }
  return false;
}
