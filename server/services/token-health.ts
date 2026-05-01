import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../helius-rpc";
import { storage } from "../storage";
import { deriveBondingCurvePDA } from "../trading";

export interface TokenHealthStatus {
  mint: string;
  exists: boolean;
  hasLiquidity: boolean;
  liquiditySOL: number;
  lastTradeAge: number | null;
  isGraduated: boolean;
  holderCount: number;
  distinctBuyers7d: number;
  survivalScore: number;
  creatorAddress: string | null;
  creatorBalancePercent: number | null;
  creatorSoldPercent: number | null;
  creatorEffectivePercent: number | null;
  curveHoldsCreatorTokens: boolean;
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
const MIN_HOLDERS_LIQUIDITY = 5;
const MIN_LIQUIDITY_SOL = 1;
const MIN_DISTINCT_BUYERS_7D = 3;
const ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
    distinctBuyers7d: 0,
    survivalScore: 0,
    creatorAddress: null,
    creatorBalancePercent: null,
    creatorSoldPercent: null,
    creatorEffectivePercent: null,
    curveHoldsCreatorTokens: false,
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

    // Real total supply from the mint itself (not sum of top-20 accounts)
    // Use BigInt to avoid precision loss for tokens with high supply / many decimals.
    let totalSupplyBI = BigInt(0);
    try {
      const supplyInfo = await connection.getTokenSupply(mintPubkey);
      totalSupplyBI = BigInt(supplyInfo.value.amount);
    } catch (e) {
      console.log(`[TokenHealth] getTokenSupply failed for ${mint}, falling back`);
    }
    const totalSupply = Number(totalSupplyBI); // for backwards-compat fields below; only used as fallback

    // Holder count from largest accounts (top 20). We use it for distribution checks only.
    let largestAccounts: { address: PublicKey; amount: string }[] = [];
    try {
      const tokenAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      largestAccounts = tokenAccounts.value.filter(a => Number(a.amount) > 0);
      result.holderCount = largestAccounts.length;
    } catch (e) {
      console.log(`[TokenHealth] Could not fetch token accounts for ${mint}`);
    }

    // Pull DB token record for graduation flag, real SOL reserves, creator address
    const dbToken = await storage.getTokenByMint(mint).catch(() => null);
    const realSolReserves = dbToken
      ? Number(dbToken.realSolReserves || "0") / 1_000_000_000
      : 0;
    result.liquiditySOL = realSolReserves;
    result.isGraduated = !!(dbToken?.isGraduated || dbToken?.raydiumPoolId);

    // Liquidity: tightened — needs ≥5 holders AND ≥1 SOL in curve (or graduated to Raydium)
    if (result.isGraduated || (result.holderCount >= MIN_HOLDERS_LIQUIDITY && realSolReserves >= MIN_LIQUIDITY_SOL)) {
      result.hasLiquidity = true;
      result.criteria.has_liquidity = true;
      result.survivalScore += 20;
    }

    // Creator effective stake: creator wallet + bonding-curve-locked supply (until graduation)
    if (dbToken?.creatorAddress && totalSupplyBI > BigInt(0)) {
      result.creatorAddress = dbToken.creatorAddress;

      let creatorBalanceBI = BigInt(0);
      try {
        const creatorPubkey = new PublicKey(dbToken.creatorAddress);
        const parsedAccounts = await connection.getParsedTokenAccountsByOwner(
          creatorPubkey,
          { mint: mintPubkey }
        );
        for (const { account } of parsedAccounts.value) {
          const parsed = (account.data as any)?.parsed;
          const amt = parsed?.info?.tokenAmount?.amount;
          if (amt) creatorBalanceBI += BigInt(amt);
        }
      } catch (e) {
        console.log(`[TokenHealth] creator ATA lookup failed for ${mint}`);
      }

      let curveBalanceBI = BigInt(0);
      if (!result.isGraduated) {
        try {
          const programIdStr = process.env.BONDING_CURVE_PROGRAM_ID;
          if (programIdStr && programIdStr !== "11111111111111111111111111111111") {
            const programId = new PublicKey(programIdStr);
            const [curvePda] = deriveBondingCurvePDA(mintPubkey, programId);
            const curveAccounts = await connection.getParsedTokenAccountsByOwner(
              curvePda,
              { mint: mintPubkey }
            );
            for (const { account } of curveAccounts.value) {
              const parsed = (account.data as any)?.parsed;
              const amt = parsed?.info?.tokenAmount?.amount;
              if (amt) curveBalanceBI += BigInt(amt);
            }
            if (curveBalanceBI > BigInt(0)) result.curveHoldsCreatorTokens = true;
          }
        } catch (e) {
          console.log(`[TokenHealth] curve PDA lookup failed for ${mint}`);
        }
      }

      const effectiveBalanceBI = creatorBalanceBI + curveBalanceBI;
      // Compute percentages in BigInt to avoid Number overflow on large supplies
      result.creatorBalancePercent = Number((creatorBalanceBI * BigInt(100)) / totalSupplyBI);
      result.creatorSoldPercent = 100 - result.creatorBalancePercent;
      result.creatorEffectivePercent = Number((effectiveBalanceBI * BigInt(100)) / totalSupplyBI);

      if (isNaN(result.creatorBalancePercent)) {
        result.creatorBalancePercent = null;
        result.creatorSoldPercent = null;
        result.creatorEffectivePercent = null;
      } else {
        // dev_holds checks effective stake (so brand-new bonding-curve tokens aren't auto-rugged)
        result.criteria.dev_holds = (result.creatorEffectivePercent ?? 0) >= DEV_HOLD_MIN;
        // dev_sold only counts what the creator actually moved out of curve+wallet
        result.criteria.dev_sold = (100 - (result.creatorEffectivePercent ?? 0)) >= RUG_THRESHOLD;
        if (result.criteria.dev_holds) result.survivalScore += 25;
      }
    }

    // Recent activity: distinct buyers in last 7d from activity feed
    try {
      const cutoff = Date.now() - ACTIVITY_WINDOW_MS;
      const activities = await storage.getActivityByToken(mint, 200);
      const recentBuyers = new Set<string>();
      let mostRecentTradeMs: number | null = null;
      for (const a of activities) {
        const t = new Date(a.createdAt).getTime();
        if (t < cutoff) continue;
        if (a.activityType === "buy" || a.activityType === "sell" || a.activityType === "trade") {
          if (mostRecentTradeMs === null || t > mostRecentTradeMs) mostRecentTradeMs = t;
          if (a.activityType === "buy" && a.walletAddress) recentBuyers.add(a.walletAddress);
        }
      }
      result.distinctBuyers7d = recentBuyers.size;
      if (mostRecentTradeMs !== null) {
        result.lastTradeAge = Math.floor((Date.now() - mostRecentTradeMs) / (1000 * 60 * 60 * 24));
      }
      if (recentBuyers.size >= MIN_DISTINCT_BUYERS_7D) {
        result.criteria.recent_activity = true;
        result.survivalScore += 20;
      }
    } catch (e) {
      console.log(`[TokenHealth] activity feed read failed for ${mint}`);
    }

    // Graduated: real flag from DB
    if (result.isGraduated) {
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
  if (q.includes("graduate") || q.includes("graduation") || q.includes("dex") || q.includes("raydium")) {
    return "graduated";
  }
  if (q.includes("survive") || q.includes("alive") || q.includes("last") || q.includes("make it") || q.includes("safe")) {
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
    case "dev_sells": {
      // Graduation short-circuit: a token that migrated to Raydium drains its
      // bonding-curve PDA into the LP pool, which makes creatorEffectivePercent
      // collapse to whatever is left in the creator's personal wallet (usually
      // < 20%). Without this guard, a successful graduation looks identical to
      // a 90% dev dump and falsely resolves "rug = YES". Graduation is the
      // opposite of a rug, so we explicitly flag it as not rugged.
      if (health.isGraduated) {
        return {
          survived: false,
          reason: "Token graduated to Raydium - liquidity migrated, not rugged",
        };
      }
      const eff = health.creatorEffectivePercent;
      if (eff === null) {
        // Can't verify - safer default is "not rugged" so we don't punish
        // creators for transient RPC failures. Was previously labeled
        // "treated as rugged" but the value was already not-rugged; aligning
        // text + value here.
        return {
          survived: false,
          reason: "Could not verify creator's token balance - defaulted to not rugged",
        };
      }
      const sold = 100 - eff;
      const rugged = sold >= RUG_THRESHOLD;
      return {
        survived: rugged,
        reason: rugged
          ? `Dev rugged - ${sold}% of supply sold/moved (threshold ${RUG_THRESHOLD}%)`
          : `Dev still controls ${eff}% of supply${health.curveHoldsCreatorTokens ? " (incl. bonding curve)" : ""} - not rugged`,
      };
    }

    case "dev_holds": {
      // Graduation short-circuit: same reasoning as dev_sells. A graduated
      // token has by definition survived the bonding curve, so it should
      // count as "alive" regardless of how much the creator personally holds.
      if (health.isGraduated) {
        return {
          survived: true,
          reason: "Token graduated to Raydium - survived the bonding curve",
        };
      }
      const eff = health.creatorEffectivePercent;
      if (eff === null) {
        const fallback = health.criteria.has_liquidity && health.criteria.recent_activity;
        return {
          survived: fallback,
          reason: fallback
            ? "Could not verify creator balance, but token has liquidity and active trading"
            : "Could not verify creator balance and token shows no activity",
        };
      }
      const survived = eff >= DEV_HOLD_MIN;
      return {
        survived,
        reason: survived
          ? `Dev still controls ${eff}% of supply${health.curveHoldsCreatorTokens ? " (incl. bonding curve)" : ""} - token survived`
          : `Dev moved tokens - only ${eff}% remaining (needs ${DEV_HOLD_MIN}%+)`,
      };
    }

    case "has_liquidity":
      return {
        survived: health.criteria.has_liquidity,
        reason: health.criteria.has_liquidity
          ? `Token has active liquidity — ${health.holderCount} holders, ${health.liquiditySOL.toFixed(2)} SOL in curve${health.isGraduated ? " (graduated)" : ""}`
          : `Token does not meet liquidity floor (needs ${MIN_HOLDERS_LIQUIDITY}+ holders AND ${MIN_LIQUIDITY_SOL} SOL in curve, or graduation)`,
      };

    case "recent_activity":
      return {
        survived: health.criteria.recent_activity,
        reason: health.criteria.recent_activity
          ? `${health.distinctBuyers7d} distinct buyers in last 7 days`
          : `Only ${health.distinctBuyers7d} distinct buyers in last 7 days (needs ${MIN_DISTINCT_BUYERS_7D}+)`,
      };

    case "graduated":
      return {
        survived: health.criteria.graduated,
        reason: health.criteria.graduated
          ? `Token graduated to Raydium`
          : `Token has not graduated to Raydium yet`,
      };

    case "high_survival": {
      // Graduation override: same root cause as dev_sells/dev_holds. After
      // migration the dev_holds component of the score collapses, dragging
      // the total below 75 even for legitimate graduates. Treat graduation
      // as the strongest possible "high survival" signal.
      if (health.isGraduated) {
        return {
          survived: true,
          reason: `Token graduated to Raydium - highest possible survival signal`,
        };
      }
      const highSurvival = health.survivalScore >= 75;
      return {
        survived: highSurvival,
        reason: highSurvival
          ? `Token has high survival score (${health.survivalScore}/100)`
          : `Token has low survival score (${health.survivalScore}/100)`,
      };
    }

    case "token_exists":
    default:
      // Graduation override: dev_holds collapses post-migration (see dev_sells
      // comment), so without this guard a graduated token would fail the
      // default "alive" check. Graduation is by definition "alive".
      if (health.isGraduated) {
        return {
          survived: true,
          reason: "Token graduated to Raydium - alive on a real DEX",
        };
      }
      return {
        survived: health.criteria.has_liquidity && health.criteria.dev_holds,
        reason: (health.criteria.has_liquidity && health.criteria.dev_holds)
          ? `Token is alive - has liquidity and dev controls ${health.creatorEffectivePercent ?? '?'}% of supply`
          : `Token is not healthy - ${!health.criteria.has_liquidity ? 'insufficient liquidity' : `dev only holds ${health.creatorEffectivePercent ?? 0}%`}`,
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
        yesCondition: `YES wins if the creator has sold/moved ${RUG_THRESHOLD}%+ of their effective stake (wallet + bonding curve) by resolution. Graduation to Raydium is NOT a rug.`,
        noCondition: `NO wins if the creator still controls more than ${100 - RUG_THRESHOLD}% of supply at resolution, OR if the token has graduated to Raydium.`,
        verificationSource: "Solana RPC: creator wallet ATA + bonding-curve PDA balance vs. mint total supply.",
        thresholds: [
          { label: "Rug threshold", value: `${RUG_THRESHOLD}%+ of supply moved` },
          { label: "Safe threshold", value: `>${100 - RUG_THRESHOLD}% still controlled` },
          { label: "Graduation override", value: "Graduated tokens are never rugged" },
        ],
        methodology: "We sum the creator wallet's token balance plus tokens still locked in the bonding curve PDA, divide by the mint's true total supply, and check whether the proportion outside that combined stake exceeds the rug threshold. Graduated tokens skip this calculation: liquidity has migrated to a real DEX, which is the opposite of a rug.",
      };

    case "dev_holds":
      return {
        criteria,
        title: "Dev Holdings Check",
        yesCondition: `YES wins if the creator's effective stake (wallet + bonding curve) is ${DEV_HOLD_MIN}%+ of supply AND the token has active liquidity, OR if the token has graduated to Raydium.`,
        noCondition: `NO wins if the creator's effective stake drops below ${DEV_HOLD_MIN}% of supply OR liquidity dries up (and the token has not graduated).`,
        verificationSource: "Solana RPC: creator wallet ATA + bonding-curve PDA balance vs. mint total supply.",
        thresholds: [
          { label: "Min effective stake", value: `${DEV_HOLD_MIN}% of total supply` },
          { label: "Min liquidity", value: `${MIN_HOLDERS_LIQUIDITY}+ holders AND ${MIN_LIQUIDITY_SOL} SOL in curve, OR graduated` },
          { label: "Graduation override", value: "Graduated tokens automatically count as alive" },
        ],
        methodology: "Effective stake counts both the creator wallet and tokens still locked in the bonding curve. Freshly-launched tokens aren't auto-classified as rugged because most supply still sits in the curve. Graduated tokens automatically pass: graduation means the token cleared 85 SOL on the curve and migrated to a real Raydium pool.",
      };

    case "has_liquidity":
      return {
        criteria,
        title: "Liquidity Check",
        yesCondition: `YES wins if the token has ${MIN_HOLDERS_LIQUIDITY}+ unique holders AND ${MIN_LIQUIDITY_SOL}+ SOL in the bonding curve, OR has graduated to Raydium.`,
        noCondition: `NO wins if the token fails to maintain that floor at resolution time.`,
        verificationSource: "Solana RPC + DB token record (real SOL reserves, graduation flag).",
        thresholds: [
          { label: "Min holders", value: `${MIN_HOLDERS_LIQUIDITY}+` },
          { label: "Min SOL in curve", value: `${MIN_LIQUIDITY_SOL} SOL` },
          { label: "Bypass", value: "Graduated to Raydium" },
        ],
        methodology: "Holder count from getTokenLargestAccounts. Curve liquidity from realSolReserves. Graduated tokens automatically pass.",
      };

    case "recent_activity":
      return {
        criteria,
        title: "Trading Activity Check",
        yesCondition: `YES wins if the token had ${MIN_DISTINCT_BUYERS_7D}+ distinct buyer wallets in the 7 days before resolution.`,
        noCondition: `NO wins if fewer than ${MIN_DISTINCT_BUYERS_7D} distinct buyers traded in that window.`,
        verificationSource: "Activity feed (on-chain trades recorded by the platform).",
        thresholds: [
          { label: "Activity window", value: "7 days before resolution" },
          { label: "Min distinct buyers", value: `${MIN_DISTINCT_BUYERS_7D}+ unique wallets` },
        ],
        methodology: "We count distinct buyer wallets from the platform's activity feed in the resolution window. A single bot tx is not enough.",
      };

    case "graduated":
      return {
        criteria,
        title: "DEX Graduation Check",
        yesCondition: "YES wins if the token has graduated from the bonding curve to Raydium by resolution.",
        noCondition: "NO wins if the token has not graduated.",
        verificationSource: "DB graduation flag (set when bonding curve fills 85 SOL and Raydium pool is created).",
        thresholds: [
          { label: "Curve fill required", value: "85 SOL" },
          { label: "Raydium pool", value: "Must exist" },
        ],
        methodology: "The system checks the token's isGraduated flag and raydiumPoolId. Both are set atomically by the graduation service.",
      };

    case "high_survival":
      return {
        criteria,
        title: "Survival Score Check",
        yesCondition: "YES wins if the token achieves a survival score of 75 or higher out of 100.",
        noCondition: "NO wins if the survival score is below 75 out of 100.",
        verificationSource: "Composite of all on-chain checks.",
        thresholds: [
          { label: "Min score", value: "75/100" },
          { label: "Score breakdown", value: "Existence (15) + Liquidity (20) + Dev Holdings (25) + Activity (20) + Graduation (20)" },
        ],
        methodology: "Composite score from existence (15), liquidity (20), dev holdings (25), recent activity (20), graduation (20).",
      };

    case "token_exists":
    default:
      return {
        criteria: criteria || "token_exists",
        title: "Token Health Check",
        yesCondition: `YES wins if the token has active liquidity AND the dev's effective stake is ${DEV_HOLD_MIN}%+.`,
        noCondition: `NO wins if liquidity drops below the floor OR effective stake drops below ${DEV_HOLD_MIN}%.`,
        verificationSource: "Solana RPC + DB.",
        thresholds: [
          { label: "Min effective stake", value: `${DEV_HOLD_MIN}%` },
          { label: "Min liquidity", value: `${MIN_HOLDERS_LIQUIDITY}+ holders AND ${MIN_LIQUIDITY_SOL} SOL` },
        ],
        methodology: "Combines the dev-holds and liquidity checks.",
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
