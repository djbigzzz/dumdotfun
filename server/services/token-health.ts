import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../helius-rpc";
import { storage } from "../storage";

export interface TokenHealthStatus {
  mint: string;
  exists: boolean;
  hasLiquidity: boolean;
  liquiditySOL: number;
  lastTradeAge: number | null;
  isGraduated: boolean;
  holderCount: number;
  survivalScore: number;
  creatorAddress: string | null;
  creatorBalancePercent: number | null;
  creatorSoldPercent: number | null;
  criteria: {
    token_exists: boolean;
    has_liquidity: boolean;
    recent_activity: boolean;
    graduated: boolean;
    dev_holds: boolean;
    dev_sold: boolean;
  };
}

const RUG_THRESHOLD = 80;
const DEV_HOLD_MIN = 20;

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
    creatorAddress: null,
    creatorBalancePercent: null,
    creatorSoldPercent: null,
    criteria: {
      token_exists: false,
      has_liquidity: false,
      recent_activity: false,
      graduated: false,
      dev_holds: false,
      dev_sold: false,
    },
  };

  try {
    const mintPubkey = new PublicKey(mint);
    const accountInfo = await connection.getAccountInfo(mintPubkey);
    
    if (accountInfo && accountInfo.data.length > 0) {
      result.exists = true;
      result.criteria.token_exists = true;
      result.survivalScore += 15;
    } else {
      return result;
    }

    let totalSupply = 0;
    let largestAccounts: { address: PublicKey; amount: string }[] = [];

    try {
      const tokenAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      largestAccounts = tokenAccounts.value;
      result.holderCount = largestAccounts.length;
      
      totalSupply = largestAccounts.reduce(
        (sum: number, acc: { amount: string }) => sum + Number(acc.amount), 
        0
      );
      
      if (totalSupply > 0 && result.holderCount > 1) {
        result.hasLiquidity = true;
        result.criteria.has_liquidity = true;
        result.survivalScore += 20;
      }
    } catch (e) {
      console.log(`[TokenHealth] Could not fetch token accounts for ${mint}`);
    }

    try {
      const token = await storage.getTokenByMint(mint);
      if (token && token.creatorAddress) {
        result.creatorAddress = token.creatorAddress;

        if (totalSupply > 0 && largestAccounts.length > 0) {
          let creatorBalance = 0;
          
          try {
            const creatorPubkey = new PublicKey(token.creatorAddress);
            const parsedAccounts = await connection.getParsedTokenAccountsByOwner(
              creatorPubkey,
              { mint: mintPubkey }
            );
            
            for (const { account } of parsedAccounts.value) {
              const parsed = (account.data as any)?.parsed;
              if (parsed?.info?.tokenAmount?.amount) {
                creatorBalance += Number(parsed.info.tokenAmount.amount);
              }
            }
          } catch (e) {
            console.log(`[TokenHealth] getParsedTokenAccountsByOwner failed for ${token.creatorAddress}, trying fallback`);
            for (const acc of largestAccounts) {
              try {
                const accInfo = await connection.getParsedAccountInfo(acc.address);
                const parsed = (accInfo.value?.data as any)?.parsed;
                if (parsed?.info?.owner === token.creatorAddress) {
                  creatorBalance += Number(acc.amount);
                }
              } catch {}
            }
          }

          result.creatorBalancePercent = totalSupply > 0 
            ? Math.round((creatorBalance / totalSupply) * 100) 
            : 0;
          result.creatorSoldPercent = 100 - result.creatorBalancePercent;

          if (isNaN(result.creatorBalancePercent) || isNaN(result.creatorSoldPercent)) {
            result.creatorBalancePercent = null;
            result.creatorSoldPercent = null;
            console.log(`[TokenHealth] Creator balance calculation returned NaN for ${mint}`);
          } else {
            result.criteria.dev_holds = result.creatorBalancePercent >= DEV_HOLD_MIN;
            result.criteria.dev_sold = result.creatorSoldPercent >= RUG_THRESHOLD;

            if (result.criteria.dev_holds) {
              result.survivalScore += 25;
            }
          }
        }
      }
    } catch (e) {
      console.log(`[TokenHealth] Could not check creator balance for ${mint}`);
    }

    try {
      const signatures = await connection.getSignaturesForAddress(mintPubkey, { limit: 1 });
      if (signatures.length > 0) {
        const lastTx = signatures[0];
        const ageMs = Date.now() - (lastTx.blockTime ? lastTx.blockTime * 1000 : Date.now());
        result.lastTradeAge = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        
        if (result.lastTradeAge < 7) {
          result.criteria.recent_activity = true;
          result.survivalScore += 20;
        }
      }
    } catch (e) {
      console.log(`[TokenHealth] Could not fetch recent activity for ${mint}`);
    }

    if (result.holderCount >= 10 && result.hasLiquidity) {
      result.isGraduated = true;
      result.criteria.graduated = true;
      result.survivalScore += 20;
    }

  } catch (error) {
    console.error(`[TokenHealth] Error checking health for ${mint}:`, error);
  }

  return result;
}

export function detectMarketCriteria(question: string): string {
  const q = question.toLowerCase();
  
  if (q.includes("rug") || q.includes("dump") || q.includes("scam") || q.includes("dev sell") || q.includes("dev bail")) {
    return "dev_sells";
  }
  
  if (q.includes("graduate") || q.includes("graduation") || q.includes("dex")) {
    return "graduated";
  }
  
  if (q.includes("survive") || q.includes("alive") || q.includes("last") || q.includes("make it")) {
    return "dev_holds";
  }
  
  if (q.includes("trade") || q.includes("active") || q.includes("volume")) {
    return "recent_activity";
  }
  
  if (q.includes("liquidity") || q.includes("liquid")) {
    return "has_liquidity";
  }
  
  return "dev_holds";
}

export function evaluateSurvival(
  health: TokenHealthStatus,
  criteria: string = "dev_holds"
): { survived: boolean; reason: string } {
  
  switch (criteria) {
    case "dev_sells":
      if (health.creatorSoldPercent === null) {
        return {
          survived: false,
          reason: "Could not verify creator's token balance — treated as rugged",
        };
      }
      return {
        survived: health.criteria.dev_sold,
        reason: health.criteria.dev_sold
          ? `Dev rugged — sold ${health.creatorSoldPercent}% of supply (threshold: ${RUG_THRESHOLD}%)`
          : `Dev still holds ${health.creatorBalancePercent}% of supply — not rugged (needs ${RUG_THRESHOLD}%+ sold to qualify)`,
      };
    
    case "dev_holds":
      if (health.creatorBalancePercent === null) {
        const fallback = health.criteria.has_liquidity && health.criteria.recent_activity;
        return {
          survived: fallback,
          reason: fallback
            ? "Could not verify creator balance, but token has liquidity and recent activity"
            : "Could not verify creator balance and token shows no activity",
        };
      }
      return {
        survived: health.criteria.dev_holds,
        reason: health.criteria.dev_holds
          ? `Dev still holds ${health.creatorBalancePercent}% of supply — token survived`
          : `Dev dumped tokens — only ${health.creatorBalancePercent}% of supply remaining (needs ${DEV_HOLD_MIN}%+)`,
      };
    
    case "has_liquidity":
      return {
        survived: health.criteria.has_liquidity && health.holderCount > 1,
        reason: health.criteria.has_liquidity 
          ? `Token has active liquidity with ${health.holderCount} holders` 
          : "Token has no liquidity or only 1 holder",
      };
    
    case "recent_activity":
      return {
        survived: health.criteria.recent_activity,
        reason: health.criteria.recent_activity 
          ? `Token had on-chain activity in the last 7 days` 
          : "Token had no on-chain activity in the last 7 days",
      };
    
    case "graduated":
      return {
        survived: health.criteria.graduated,
        reason: health.criteria.graduated 
          ? `Token graduated — ${health.holderCount} holders with active liquidity`
          : `Token did not graduate — only ${health.holderCount} holders (needs 10+)`,
      };
    
    case "high_survival":
      const highSurvival = health.survivalScore >= 75;
      return {
        survived: highSurvival,
        reason: highSurvival 
          ? `Token has high survival score (${health.survivalScore}/100)` 
          : `Token has low survival score (${health.survivalScore}/100)`,
      };
    
    case "token_exists":
    default:
      return {
        survived: health.criteria.has_liquidity && health.criteria.dev_holds,
        reason: (health.criteria.has_liquidity && health.criteria.dev_holds)
          ? `Token is alive — has liquidity and dev holds ${health.creatorBalancePercent ?? '?'}% of supply`
          : `Token is not healthy — ${!health.criteria.has_liquidity ? 'no liquidity' : `dev only holds ${health.creatorBalancePercent ?? 0}%`}`,
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
