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

export interface ResolutionRules {
  criteria: string;
  title: string;
  yesCondition: string;
  noCondition: string;
  verificationSource: string;
  thresholds: { label: string; value: string }[];
  methodology: string;
}

export function getResolutionRules(criteria: string): ResolutionRules {
  switch (criteria) {
    case "dev_sells":
      return {
        criteria,
        title: "Dev Rug Check",
        yesCondition: `YES wins if the token creator has sold ${RUG_THRESHOLD}% or more of the total token supply by the resolution date.`,
        noCondition: `NO wins if the token creator still holds more than ${100 - RUG_THRESHOLD}% of the total supply at resolution time.`,
        verificationSource: "On-chain verification via Solana RPC (getParsedTokenAccountsByOwner). The creator's wallet is the address that deployed the token.",
        thresholds: [
          { label: "Rug threshold", value: `Creator sells ${RUG_THRESHOLD}%+ of supply` },
          { label: "Safe threshold", value: `Creator holds >${100 - RUG_THRESHOLD}% of supply` },
        ],
        methodology: "The system checks the token creator's wallet balance on the Solana blockchain. Total supply is calculated from all token accounts. If the creator's balance divided by total supply is below " + (100 - RUG_THRESHOLD) + "%, the dev is considered to have rugged.",
      };

    case "dev_holds":
      return {
        criteria,
        title: "Dev Holdings Check",
        yesCondition: `YES wins if the token creator still holds ${DEV_HOLD_MIN}% or more of the total token supply AND the token has active liquidity (2+ holders).`,
        noCondition: `NO wins if the creator holds less than ${DEV_HOLD_MIN}% of supply OR the token has no liquidity.`,
        verificationSource: "On-chain verification via Solana RPC (getParsedTokenAccountsByOwner). The creator's wallet is the address that deployed the token.",
        thresholds: [
          { label: "Min dev holdings", value: `${DEV_HOLD_MIN}% of total supply` },
          { label: "Min holders", value: "2+ unique token holders" },
        ],
        methodology: "The system checks the token creator's on-chain wallet balance and compares it to total supply. Additionally verifies the token has multiple holders with non-zero balances, confirming active liquidity.",
      };

    case "has_liquidity":
      return {
        criteria,
        title: "Liquidity Check",
        yesCondition: "YES wins if the token has 2 or more holders with non-zero balances at resolution time.",
        noCondition: "NO wins if the token has only 1 holder or all balances are zero.",
        verificationSource: "On-chain verification via Solana RPC (getTokenLargestAccounts).",
        thresholds: [
          { label: "Min holders", value: "2+ unique holders with balance > 0" },
        ],
        methodology: "The system queries the token's largest accounts on-chain and counts holders with non-zero balances.",
      };

    case "recent_activity":
      return {
        criteria,
        title: "Trading Activity Check",
        yesCondition: "YES wins if the token had at least one on-chain transaction within the last 7 days before the resolution date.",
        noCondition: "NO wins if there were zero on-chain transactions involving the token in the 7 days before resolution.",
        verificationSource: "On-chain verification via Solana RPC (getSignaturesForAddress).",
        thresholds: [
          { label: "Activity window", value: "7 days before resolution date" },
          { label: "Min transactions", value: "1+ on-chain transaction" },
        ],
        methodology: "The system checks the most recent transaction signature for the token mint address and calculates the age in days.",
      };

    case "graduated":
      return {
        criteria,
        title: "DEX Graduation Check",
        yesCondition: "YES wins if the token has 10 or more unique holders AND active liquidity at resolution time.",
        noCondition: "NO wins if the token has fewer than 10 holders or no active liquidity.",
        verificationSource: "On-chain verification via Solana RPC (getTokenLargestAccounts).",
        thresholds: [
          { label: "Min holders for graduation", value: "10+ unique holders" },
          { label: "Liquidity required", value: "Total supply > 0 with 2+ holders" },
        ],
        methodology: "The system queries the token's largest accounts to count holders. Graduation requires 10+ holders with active liquidity, indicating the token has reached meaningful distribution.",
      };

    case "high_survival":
      return {
        criteria,
        title: "Survival Score Check",
        yesCondition: "YES wins if the token achieves a survival score of 75 or higher out of 100.",
        noCondition: "NO wins if the survival score is below 75 out of 100.",
        verificationSource: "On-chain verification via Solana RPC — composite score from multiple checks.",
        thresholds: [
          { label: "Min survival score", value: "75/100" },
          { label: "Score breakdown", value: "Existence (15) + Liquidity (20) + Dev Holdings (25) + Activity (20) + Graduation (20)" },
        ],
        methodology: "A composite score is calculated from five on-chain checks: token existence (15 pts), active liquidity (20 pts), dev still holding tokens (25 pts), recent trading activity (20 pts), and DEX graduation (20 pts).",
      };

    case "token_exists":
    default:
      return {
        criteria: criteria || "token_exists",
        title: "Token Health Check",
        yesCondition: `YES wins if the token has active liquidity AND the creator still holds ${DEV_HOLD_MIN}%+ of supply.`,
        noCondition: `NO wins if the token has no liquidity OR the creator holds less than ${DEV_HOLD_MIN}% of supply.`,
        verificationSource: "On-chain verification via Solana RPC (getParsedTokenAccountsByOwner, getTokenLargestAccounts).",
        thresholds: [
          { label: "Min dev holdings", value: `${DEV_HOLD_MIN}% of total supply` },
          { label: "Min holders", value: "2+ unique token holders" },
        ],
        methodology: "The system checks both the creator's token balance and overall liquidity on the Solana blockchain.",
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
