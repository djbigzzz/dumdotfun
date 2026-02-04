import { storage } from "../storage";
import { checkTokenHealth, evaluateSurvival } from "./token-health";

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
        const criteria = market.survivalCriteria || "token_exists";
        const evaluation = evaluateSurvival(health, criteria);
        
        const outcome = evaluation.survived ? "yes" : "no";
        
        const positions = await storage.getPositionsByMarket(market.id);
        const winningPositions = positions.filter(p => p.side === outcome);
        const losingPositions = positions.filter(p => p.side !== outcome);
        
        const totalPool = Number(market.yesPool) + Number(market.noPool);
        
        await storage.resolveMarket(market.id, outcome);
        
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
    const criteria = market.survivalCriteria || "token_exists";
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
