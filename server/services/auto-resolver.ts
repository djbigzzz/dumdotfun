import { storage } from "../storage";
import { checkTokenHealth, evaluateSurvival, detectMarketCriteria } from "./token-health";

export interface ResolutionResult {
  marketId: string;
  question: string;
  outcome: "yes" | "no";
  reason: string;
  tokenMint: string;
  survivalScore: number;
  payouts: {
    winnerCount: number;
    loserCount: number;
    totalPool: number;
  };
}

export async function autoResolveExpiredMarkets(): Promise<ResolutionResult[]> {
  const results: ResolutionResult[] = [];
  
  try {
    const expiredMarkets = await storage.getExpiredMarkets();
    
    console.log(`[AutoResolver] Found ${expiredMarkets.length} expired markets to evaluate`);
    
    for (const market of expiredMarkets) {
      if (!market.autoResolve) {
        console.log(`[AutoResolver] Skipping ${market.id} - auto-resolve disabled`);
        continue;
      }
      
      try {
        const health = await checkTokenHealth(market.tokenMint);
        let criteria = market.survivalCriteria || "token_exists";
        if (criteria === "token_exists") {
          criteria = detectMarketCriteria(market.question);
          console.log(`[AutoResolver] Auto-detected criteria "${criteria}" from question: "${market.question}"`);
        }
        const evaluation = evaluateSurvival(health, criteria);
        
        const outcome = evaluation.survived ? "yes" : "no";
        
        const positions = await storage.getPositionsByMarket(market.id);
        const winningPositions = positions.filter(p => p.side === outcome);
        const losingPositions = positions.filter(p => p.side !== outcome);
        
        const totalPool = Number(market.yesPool) + Number(market.noPool);
        
        await storage.resolveMarket(market.id, outcome);

        // Award the "first_win" quest to every wallet that bet on the
        // winning side. awardQuest is idempotent (it checks for an existing
        // first_win row before granting), so re-running on the same wallet
        // across many markets is safe.
        try {
          const { awardQuest } = await import("./points");
          const winningWallets = Array.from(new Set(
            winningPositions
              .map(p => p.walletAddress)
              .filter((w): w is string => !!w)
          ));
          // Sequential, not Promise.all: awardQuest dedups via read-then-insert
          // and has no DB unique constraint, so concurrent calls for the same
          // wallet (rare but possible if a user wins multiple markets in the
          // same resolution cycle) could race past the dedup check and
          // double-grant points. Sequential awarding closes that window.
          for (const w of winningWallets) {
            try {
              await awardQuest(w, "first_win");
            } catch (err) {
              console.error(`[AutoResolver] first_win award failed for ${w}:`, err);
            }
          }
        } catch (err) {
          console.error("[AutoResolver] Failed to award first_win quests:", err);
        }

        // SOL payout to winners. Hooked here so a market's resolution and
        // its payouts are atomic from the user's perspective. Idempotent:
        // payoutMarket inserts on UNIQUE position_id and skips already-paid
        // positions, so retries on flaky RPC are safe.
        let payoutSummary = { inserted: 0, sent: 0, failed: 0, totalPoolSol: totalPool };
        try {
          const { payoutMarket } = await import("./market-payouts");
          payoutSummary = await payoutMarket(market.id);
        } catch (err) {
          console.error(`[AutoResolver] Payout failed for ${market.id}:`, err);
        }

        await storage.addActivity({
          activityType: "market_auto_resolved",
          tokenMint: market.tokenMint,
          marketId: market.id,
          walletAddress: null,
          amount: totalPool.toString(),
          metadata: JSON.stringify({
            question: market.question,
            outcome,
            reason: evaluation.reason,
            criteria,
            survivalScore: health.survivalScore,
            winnerCount: winningPositions.length,
            loserCount: losingPositions.length,
            payouts: payoutSummary,
          }),
        });
        
        results.push({
          marketId: market.id,
          question: market.question,
          outcome,
          reason: evaluation.reason,
          tokenMint: market.tokenMint,
          survivalScore: health.survivalScore,
          payouts: {
            winnerCount: winningPositions.length,
            loserCount: losingPositions.length,
            totalPool,
          },
        });
        
        console.log(`[AutoResolver] Resolved ${market.id}: ${outcome.toUpperCase()} - ${evaluation.reason}`);
        
        await new Promise(r => setTimeout(r, 200));
        
      } catch (error) {
        console.error(`[AutoResolver] Error resolving market ${market.id}:`, error);
      }
    }
    
    console.log(`[AutoResolver] Completed: ${results.length} markets resolved`);
    
  } catch (error) {
    console.error("[AutoResolver] Error in auto-resolution:", error);
  }
  
  return results;
}

export async function getMarketResolutionPreview(marketId: string): Promise<{
  market: any;
  health: any;
  evaluation: any;
  projectedOutcome: "yes" | "no";
  positions: {
    yes: number;
    no: number;
    totalPool: number;
  };
} | null> {
  try {
    const market = await storage.getMarket(marketId);
    if (!market) return null;
    
    const health = await checkTokenHealth(market.tokenMint);
    let criteria = market.survivalCriteria || "token_exists";
    if (criteria === "token_exists") {
      criteria = detectMarketCriteria(market.question);
    }
    const evaluation = evaluateSurvival(health, criteria);
    
    const positions = await storage.getPositionsByMarket(marketId);
    const yesPositions = positions.filter(p => p.side === "yes");
    const noPositions = positions.filter(p => p.side === "no");
    
    return {
      market: {
        id: market.id,
        question: market.question,
        resolutionDate: market.resolutionDate,
        status: market.status,
        criteria: market.survivalCriteria,
        resolutionType: market.resolutionType,
      },
      health,
      evaluation,
      projectedOutcome: evaluation.survived ? "yes" : "no",
      positions: {
        yes: yesPositions.length,
        no: noPositions.length,
        totalPool: Number(market.yesPool) + Number(market.noPool),
      },
    };
  } catch (error) {
    console.error(`[AutoResolver] Error previewing market ${marketId}:`, error);
    return null;
  }
}
