import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../helius-rpc";

export interface TokenHealthStatus {
  mint: string;
  exists: boolean;
  hasLiquidity: boolean;
  liquiditySOL: number;
  lastTradeAge: number | null;
  isGraduated: boolean;
  holderCount: number;
  survivalScore: number;
  criteria: {
    token_exists: boolean;
    has_liquidity: boolean;
    recent_activity: boolean;
    graduated: boolean;
  };
}

export async function checkTokenHealth(mint: string): Promise<TokenHealthStatus> {
  const connection = getConnection();
  
  const result: TokenHealthStatus = {
    mint,
    exists: false,
    hasLiquidity: false,
    liquiditySOL: 0,
    lastTradeAge: null,
    isGraduated: false,
    holderCount: 0,
    survivalScore: 0,
    criteria: {
      token_exists: false,
      has_liquidity: false,
      recent_activity: false,
      graduated: false,
    },
  };

  try {
    const mintPubkey = new PublicKey(mint);
    const accountInfo = await connection.getAccountInfo(mintPubkey);
    
    if (accountInfo && accountInfo.data.length > 0) {
      result.exists = true;
      result.criteria.token_exists = true;
      result.survivalScore += 25;
    } else {
      return result;
    }

    try {
      const tokenAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      result.holderCount = tokenAccounts.value.length;
      
      const totalSupply = tokenAccounts.value.reduce(
        (sum: number, acc: { amount: string }) => sum + Number(acc.amount), 
        0
      );
      
      if (totalSupply > 0 && result.holderCount > 1) {
        result.hasLiquidity = true;
        result.criteria.has_liquidity = true;
        result.survivalScore += 25;
      }
    } catch (e) {
      console.log(`[TokenHealth] Could not fetch token accounts for ${mint}`);
    }

    try {
      const signatures = await connection.getSignaturesForAddress(mintPubkey, { limit: 1 });
      if (signatures.length > 0) {
        const lastTx = signatures[0];
        const ageMs = Date.now() - (lastTx.blockTime ? lastTx.blockTime * 1000 : Date.now());
        result.lastTradeAge = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        
        if (result.lastTradeAge < 7) {
          result.criteria.recent_activity = true;
          result.survivalScore += 25;
        }
      }
    } catch (e) {
      console.log(`[TokenHealth] Could not fetch recent activity for ${mint}`);
    }

    if (result.holderCount >= 10 && result.hasLiquidity) {
      result.isGraduated = true;
      result.criteria.graduated = true;
      result.survivalScore += 25;
    }

  } catch (error) {
    console.error(`[TokenHealth] Error checking health for ${mint}:`, error);
  }

  return result;
}

export function evaluateSurvival(
  health: TokenHealthStatus,
  criteria: string = "token_exists"
): { survived: boolean; reason: string } {
  
  switch (criteria) {
    case "token_exists":
      return {
        survived: health.criteria.token_exists,
        reason: health.criteria.token_exists 
          ? "Token still exists on-chain" 
          : "Token no longer exists on-chain",
      };
    
    case "has_liquidity":
      return {
        survived: health.criteria.token_exists && health.criteria.has_liquidity,
        reason: health.criteria.has_liquidity 
          ? "Token has active liquidity" 
          : "Token has no liquidity",
      };
    
    case "recent_activity":
      return {
        survived: health.criteria.token_exists && health.criteria.recent_activity,
        reason: health.criteria.recent_activity 
          ? "Token had trades in the last 7 days" 
          : "Token had no recent trading activity",
      };
    
    case "graduated":
      return {
        survived: health.criteria.graduated,
        reason: health.criteria.graduated 
          ? "Token graduated to DEX" 
          : "Token did not graduate",
      };
    
    case "high_survival":
      const highSurvival = health.survivalScore >= 75;
      return {
        survived: highSurvival,
        reason: highSurvival 
          ? `Token has high survival score (${health.survivalScore}/100)` 
          : `Token has low survival score (${health.survivalScore}/100)`,
      };
    
    default:
      return {
        survived: health.criteria.token_exists,
        reason: health.criteria.token_exists 
          ? "Token exists (default criteria)" 
          : "Token does not exist",
      };
  }
}

export async function batchCheckTokenHealth(mints: string[]): Promise<Map<string, TokenHealthStatus>> {
  const results = new Map<string, TokenHealthStatus>();
  
  for (const mint of mints) {
    const health = await checkTokenHealth(mint);
    results.set(mint, health);
    await new Promise(r => setTimeout(r, 100));
  }
  
  return results;
}
