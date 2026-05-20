import { db } from "../db";
import { userPoints, pointsHistory, users } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const OG_MULTIPLIER = 1.2;

const TIERS = [
  { name: "solana_god", minPoints: 10000, label: "On-Chain God", emoji: "💎" },
  { name: "rug_proof", minPoints: 5000, label: "Diamond Hands", emoji: "🛡️" },
  { name: "degen", minPoints: 2000, label: "Full Degen", emoji: "🔥" },
  { name: "bonding_curve", minPoints: 500, label: "Curve Rider", emoji: "📈" },
  { name: "pill_popper", minPoints: 0, label: "Fresh Pill", emoji: "💊" },
];

interface QuestDefinition {
  id: string;
  action: string;
  category: "onboarding" | "activity" | "streaks" | "special" | "og_exclusive";
  title: string;
  description: string;
  points: number;
  repeatable: boolean;
}

const QUESTS: QuestDefinition[] = [
  { id: "connect_wallet", action: "connect_wallet", category: "onboarding", title: "Connect Wallet", description: "Connect your Phantom wallet", points: 50, repeatable: false },
  { id: "first_trade", action: "first_trade", category: "onboarding", title: "First Trade", description: "Buy or sell a token", points: 100, repeatable: false },
  { id: "first_bet", action: "first_bet", category: "onboarding", title: "Place a Bet", description: "Bet on a prediction market", points: 100, repeatable: false },
  { id: "first_token", action: "first_token", category: "activity", title: "Token Creator", description: "Launch your first token", points: 500, repeatable: false },
  { id: "first_market", action: "first_market", category: "activity", title: "Market Maker", description: "Create a prediction market", points: 300, repeatable: false },
  { id: "first_win", action: "first_win", category: "activity", title: "Winner", description: "Win a prediction market bet", points: 200, repeatable: false },
  { id: "daily_login", action: "daily_login", category: "streaks", title: "Daily Check-in", description: "Log in daily for bonus points", points: 10, repeatable: true },
  { id: "streak_7", action: "streak_7", category: "streaks", title: "7-Day Streak", description: "Check in 7 days in a row", points: 150, repeatable: false },
  { id: "streak_30", action: "streak_30", category: "streaks", title: "30-Day Streak", description: "Check in 30 days in a row", points: 600, repeatable: false },
  { id: "mint_og_nft", action: "mint_og_nft", category: "special", title: "OG Card", description: "Claim the free OG Card (1.2x boost)", points: 500, repeatable: false },
];

function calculateTier(points: number): string {
  for (const tier of TIERS) {
    if (points >= tier.minPoints) return tier.name;
  }
  return "pill_popper";
}

function getTierInfo(tierName: string) {
  const tier = TIERS.find(t => t.name === tierName) || TIERS[TIERS.length - 1];
  const tierIndex = TIERS.indexOf(tier);
  const nextTier = tierIndex > 0 ? TIERS[tierIndex - 1] : null;
  return { ...tier, nextTier };
}

async function getOrCreateUserPoints(walletAddress: string) {
  const [existing] = await db.select().from(userPoints).where(eq(userPoints.walletAddress, walletAddress));
  if (existing) return existing;
  const [created] = await db.insert(userPoints).values({ walletAddress }).returning();
  return created;
}

async function hasOgNft(walletAddress: string): Promise<boolean> {
  const up = await getOrCreateUserPoints(walletAddress);
  return !!up.ogNftMint;
}

async function awardPointsInternal(walletAddress: string, action: string, basePoints: number) {
  const ogHolder = await hasOgNft(walletAddress);
  const bonusPoints = ogHolder ? Math.floor(basePoints * (OG_MULTIPLIER - 1)) : 0;
  const finalPoints = basePoints + bonusPoints;

  await db.insert(pointsHistory).values({
    walletAddress,
    action,
    points: finalPoints,
    basePoints,
    bonusPoints: bonusPoints > 0 ? bonusPoints : null,
  });

  const newTotalResult = await db.update(userPoints)
    .set({
      totalPoints: sql`${userPoints.totalPoints} + ${finalPoints}`,
      updatedAt: new Date(),
    })
    .where(eq(userPoints.walletAddress, walletAddress))
    .returning();

  if (newTotalResult.length > 0) {
    const newTotal = newTotalResult[0].totalPoints;
    const newTier = calculateTier(newTotal);
    if (newTier !== newTotalResult[0].tier) {
      await db.update(userPoints)
        .set({ tier: newTier })
        .where(eq(userPoints.walletAddress, walletAddress));
    }
  }

  // Cascade a 10% bonus to the referrer for *every* points-earning action,
  // not just daily logins. This covers trades, bets, token/market creation,
  // streak bonuses, the connect-wallet quest, OG card, and any future quest.
  // We skip the "referral_bonus" action itself to prevent infinite chains
  // (referrer A → referrer B → referrer C ...).
  if (action !== "referral_bonus") {
    try {
      await awardReferralBonus(walletAddress, finalPoints, action);
    } catch (err) {
      console.error("[points] referral bonus cascade failed for", walletAddress, err);
    }
  }

  return { basePoints, bonusPoints, finalPoints };
}

export async function awardQuest(walletAddress: string, action: string): Promise<{ awarded: boolean; points: number }> {
  await getOrCreateUserPoints(walletAddress);

  const quest = QUESTS.find(q => q.action === action);
  if (!quest) return { awarded: false, points: 0 };

  if (quest.repeatable) {
    const result = await awardPointsInternal(walletAddress, quest.id, quest.points);
    return { awarded: true, points: result.finalPoints };
  }

  const [existing] = await db.select().from(pointsHistory)
    .where(and(eq(pointsHistory.walletAddress, walletAddress), eq(pointsHistory.action, quest.id)))
    .limit(1);

  if (existing) return { awarded: false, points: 0 };

  const result = await awardPointsInternal(walletAddress, quest.id, quest.points);

  // If this is the qualifying action, settle any deferred referrer signup
  // bonus now that we know the referee is a real user.
  if (quest.action === "first_trade" || quest.action === "first_bet") {
    try { await settlePendingReferral(walletAddress); } catch (e) {
      console.error("[points] settlePendingReferral failed for", walletAddress, e);
    }
  }

  return { awarded: true, points: result.finalPoints };
}

// Sybil guard: a referee only "unlocks" referral earnings (cascade + deferred
// signup bonus) once they prove they're a real user by completing an action
// with on-chain cost — a first trade or first bet. Onboarding clicks alone
// (connect_wallet, mint_og_nft) are free to script and were the main farming
// vector. We cache the result on the user_points row implicitly: presence of
// a first_trade or first_bet history row is the source of truth.
async function isRefereeQualified(walletAddress: string): Promise<boolean> {
  const rows = await db.select({ action: pointsHistory.action })
    .from(pointsHistory)
    .where(and(
      eq(pointsHistory.walletAddress, walletAddress),
      sql`${pointsHistory.action} IN ('first_trade','first_bet')`,
    ))
    .limit(1);
  return rows.length > 0;
}

const REFERRAL_SIGNUP_DAILY_CAP = 10;
const REFERRAL_SIGNUP_MINUTE_CAP = 3;

async function referrerWithinCaps(referrerWallet: string): Promise<boolean> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const minuteAgo = new Date(Date.now() - 60 * 1000);
  const [dayCount] = await db.select({ n: sql<number>`COUNT(*)` })
    .from(pointsHistory)
    .where(and(
      eq(pointsHistory.walletAddress, referrerWallet),
      eq(pointsHistory.action, "referral_signup"),
      sql`${pointsHistory.createdAt} >= ${dayAgo}`,
    ));
  if (Number(dayCount?.n || 0) >= REFERRAL_SIGNUP_DAILY_CAP) return false;
  const [minCount] = await db.select({ n: sql<number>`COUNT(*)` })
    .from(pointsHistory)
    .where(and(
      eq(pointsHistory.walletAddress, referrerWallet),
      eq(pointsHistory.action, "referral_signup"),
      sql`${pointsHistory.createdAt} >= ${minuteAgo}`,
    ));
  return Number(minCount?.n || 0) < REFERRAL_SIGNUP_MINUTE_CAP;
}

async function awardReferralBonus(walletAddress: string, pointsEarned: number, sourceAction: string) {
  const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
  if (!user?.referredBy) return;

  const referrerWallet = user.referredBy;
  // Defense-in-depth self-referral guard. The signup path already blocks this,
  // but any legacy row where referredBy === walletAddress (e.g. seeded data)
  // would otherwise let a user farm bonuses against themselves on every action.
  if (referrerWallet === walletAddress) return;

  // Anti-sybil: don't cascade bonuses from a referee until they've proven
  // real activity (first_trade or first_bet). Without this a farmer scripts
  // 100 puppet wallets through the onboarding flow and pockets a bonus on
  // every click. We allow the first_trade/first_bet action itself through
  // because that's the moment the referee qualifies.
  if (sourceAction !== "first_trade" && sourceAction !== "first_bet") {
    const qualified = await isRefereeQualified(walletAddress);
    if (!qualified) return;
  }

  await getOrCreateUserPoints(referrerWallet);
  const bonusPoints = Math.floor(pointsEarned * 0.1);
  if (bonusPoints <= 0) return;

  await db.insert(pointsHistory).values({
    walletAddress: referrerWallet,
    action: "referral_bonus",
    points: bonusPoints,
    basePoints: bonusPoints,
    referralSource: walletAddress,
  });

  const updated = await db.update(userPoints)
    .set({
      totalPoints: sql`${userPoints.totalPoints} + ${bonusPoints}`,
      updatedAt: new Date(),
    })
    .where(eq(userPoints.walletAddress, referrerWallet))
    .returning();

  if (updated.length > 0) {
    const newTier = calculateTier(updated[0].totalPoints);
    if (newTier !== updated[0].tier) {
      await db.update(userPoints).set({ tier: newTier }).where(eq(userPoints.walletAddress, referrerWallet));
    }
  }
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate();
}

function isYesterday(last: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(last, yesterday);
}

export async function awardDailyLogin(walletAddress: string): Promise<{ awarded: boolean; points: number; streak: number; streakBonus?: number }> {
  const up = await getOrCreateUserPoints(walletAddress);
  const now = new Date();

  if (up.lastDailyLogin && isSameDay(new Date(up.lastDailyLogin), now)) {
    return { awarded: false, points: 0, streak: up.streak };
  }

  let newStreak = 1;
  if (up.lastStreakDate) {
    const lastDate = new Date(up.lastStreakDate);
    if (isYesterday(lastDate, now)) {
      newStreak = up.streak + 1;
    }
  }

  await db.update(userPoints)
    .set({ lastDailyLogin: now, streak: newStreak, lastStreakDate: now })
    .where(eq(userPoints.walletAddress, walletAddress));

  const dailyResult = await awardPointsInternal(walletAddress, "daily_login", 10);
  let streakBonus = 0;

  if (newStreak >= 7) {
    const [existing7] = await db.select().from(pointsHistory)
      .where(and(eq(pointsHistory.walletAddress, walletAddress), eq(pointsHistory.action, "streak_7")))
      .limit(1);
    if (!existing7) {
      const bonus = await awardPointsInternal(walletAddress, "streak_7", 150);
      streakBonus += bonus.finalPoints;
    }
  }

  if (newStreak >= 30) {
    const [existing30] = await db.select().from(pointsHistory)
      .where(and(eq(pointsHistory.walletAddress, walletAddress), eq(pointsHistory.action, "streak_30")))
      .limit(1);
    if (!existing30) {
      const bonus = await awardPointsInternal(walletAddress, "streak_30", 600);
      streakBonus += bonus.finalPoints;
    }
  }

  // Referral bonus is now cascaded automatically inside awardPointsInternal,
  // so no manual call is needed here.

  return { awarded: true, points: dailyResult.finalPoints, streak: newStreak, streakBonus: streakBonus || undefined };
}

// One-time bonus paid to the referrer the moment a friend signs up via their
// link. Without this the referrer sees nothing for hours/days until the friend
// starts logging in daily, which is bad UX and was the original complaint.
const SIGNUP_REFERRAL_BONUS = 100;

export async function awardSignupReferralBonus(newUserWallet: string, referrerWallet: string): Promise<void> {
  if (referrerWallet === newUserWallet) return; // self-referral guard
  await getOrCreateUserPoints(referrerWallet);

  // Idempotent: only ever record once per (referrer, new user) pair, whether
  // pending or settled.
  const [existing] = await db.select().from(pointsHistory)
    .where(and(
      eq(pointsHistory.walletAddress, referrerWallet),
      sql`${pointsHistory.action} IN ('referral_signup','referral_signup_pending')`,
      eq(pointsHistory.referralSource, newUserWallet),
    ))
    .limit(1);
  if (existing) return;

  // Defer the bonus until the referee proves they're real (first trade/bet).
  // We still write a 0-point pending row so we have something to settle later
  // and so the referrer can see "pending" referrals in their history.
  const qualified = await isRefereeQualified(newUserWallet);
  if (!qualified) {
    await db.insert(pointsHistory).values({
      walletAddress: referrerWallet,
      action: "referral_signup_pending",
      points: 0,
      basePoints: 0,
      referralSource: newUserWallet,
    });
    return;
  }

  await creditSignupReferralBonus(referrerWallet, newUserWallet);
}

// Settles the deferred signup bonus once the referee qualifies. Also enforces
// the per-referrer rate caps. Idempotent: skipped if already credited.
async function creditSignupReferralBonus(referrerWallet: string, newUserWallet: string): Promise<void> {
  const [alreadyPaid] = await db.select().from(pointsHistory)
    .where(and(
      eq(pointsHistory.walletAddress, referrerWallet),
      eq(pointsHistory.action, "referral_signup"),
      eq(pointsHistory.referralSource, newUserWallet),
    ))
    .limit(1);
  if (alreadyPaid) return;

  if (!(await referrerWithinCaps(referrerWallet))) {
    // Leave the pending row in place so we don't lose the referee link, but
    // do not credit. Caller can retry next day; the daily cap will let it
    // through once the burst clears.
    return;
  }

  await db.insert(pointsHistory).values({
    walletAddress: referrerWallet,
    action: "referral_signup",
    points: SIGNUP_REFERRAL_BONUS,
    basePoints: SIGNUP_REFERRAL_BONUS,
    referralSource: newUserWallet,
  });

  const updated = await db.update(userPoints)
    .set({
      totalPoints: sql`${userPoints.totalPoints} + ${SIGNUP_REFERRAL_BONUS}`,
      updatedAt: new Date(),
    })
    .where(eq(userPoints.walletAddress, referrerWallet))
    .returning();

  if (updated.length > 0) {
    const newTier = calculateTier(updated[0].totalPoints);
    if (newTier !== updated[0].tier) {
      await db.update(userPoints).set({ tier: newTier }).where(eq(userPoints.walletAddress, referrerWallet));
    }
  }
}

// Called from awardQuest when a user completes first_trade or first_bet —
// the moment they "qualify" as real. Settles any deferred signup bonus for
// the wallet that referred them.
async function settlePendingReferral(refereeWallet: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.walletAddress, refereeWallet));
  if (!user?.referredBy) return;
  if (user.referredBy === refereeWallet) return;
  await creditSignupReferralBonus(user.referredBy, refereeWallet);
}

function canAutoComplete(action: string, _walletAddress: string, up: any): boolean {
  switch (action) {
    case "connect_wallet":
      return true;
    case "mint_og_nft":
      return !!up.ogNftMint;
    default:
      return false;
  }
}

export async function getUserPointsData(walletAddress: string) {
  const up = await getOrCreateUserPoints(walletAddress);
  const history = await db.select().from(pointsHistory)
    .where(eq(pointsHistory.walletAddress, walletAddress))
    .orderBy(desc(pointsHistory.createdAt))
    .limit(20);

  const completedActions = new Set(history.map(h => h.action));

  const dailyDone = up.lastDailyLogin && isSameDay(new Date(up.lastDailyLogin), new Date());
  const tierInfo = getTierInfo(up.tier);

  const isOgHolder = !!up.ogNftMint;

  const totalBonusPoints = isOgHolder
    ? history.reduce((sum, h) => sum + (h.bonusPoints || 0), 0)
    : 0;

  const questList = QUESTS
    .map(q => ({
      action: q.action,
      points: q.points,
      completed: q.repeatable ? false : completedActions.has(q.id),
      repeatable: q.repeatable,
      category: q.category,
      title: q.title,
      description: q.description,
      canClaim: !q.repeatable && !completedActions.has(q.id) && canAutoComplete(q.action, walletAddress, up),
    }));

  return {
    totalPoints: up.totalPoints,
    tier: up.tier,
    tierLabel: tierInfo.label,
    tierEmoji: tierInfo.emoji,
    nextTier: tierInfo.nextTier ? { name: tierInfo.nextTier.name, label: tierInfo.nextTier.label, minPoints: tierInfo.nextTier.minPoints } : null,
    ogNftMint: up.ogNftMint,
    hasOgCard: !!up.ogNftMint,
    ogBoost: up.ogNftMint ? "20%" : "0%",
    ogMultiplier: isOgHolder ? OG_MULTIPLIER : 1,
    totalBonusPoints,
    lastDailyLogin: up.lastDailyLogin,
    streak: up.streak,
    dailyCheckedIn: !!dailyDone,
    completedQuests: questList.filter(q => q.completed).map(q => q.action),
    questDefinitions: questList,
    history: history.map(h => ({
      action: h.action,
      points: h.points,
      createdAt: h.createdAt,
      referralSource: h.referralSource,
    })),
  };
}

async function attachDisplayNames<T extends { walletAddress: string }>(rows: T[]): Promise<(T & { displayName: string | null })[]> {
  if (rows.length === 0) return [];
  const wallets = rows.map(r => r.walletAddress);
  const { users } = await import("@shared/schema");
  const { inArray } = await import("drizzle-orm");
  const userRows = await db
    .select({ walletAddress: users.walletAddress, displayName: users.displayName })
    .from(users)
    .where(inArray(users.walletAddress, wallets));
  const nameMap = new Map(userRows.map(u => [u.walletAddress, u.displayName]));
  return rows.map(r => ({ ...r, displayName: nameMap.get(r.walletAddress) ?? null }));
}

export async function getLeaderboard(period: "daily" | "weekly" | "all" = "all", limit: number = 50) {
  if (period === "all") {
    const rows = await db.select({
      walletAddress: userPoints.walletAddress,
      totalPoints: userPoints.totalPoints,
      tier: userPoints.tier,
      ogNftMint: userPoints.ogNftMint,
    })
      .from(userPoints)
      .orderBy(desc(userPoints.totalPoints))
      .limit(limit);
    return attachDisplayNames(rows);
  }

  const since = new Date();
  if (period === "daily") since.setHours(since.getHours() - 24);
  else if (period === "weekly") since.setDate(since.getDate() - 7);

  const result = await db.select({
    walletAddress: pointsHistory.walletAddress,
    periodPoints: sql<number>`SUM(${pointsHistory.points})`.as("period_points"),
  })
    .from(pointsHistory)
    .where(sql`${pointsHistory.createdAt} >= ${since}`)
    .groupBy(pointsHistory.walletAddress)
    .orderBy(sql`period_points DESC`)
    .limit(limit);

  const enriched = await Promise.all(result.map(async (r) => {
    const [up] = await db.select().from(userPoints).where(eq(userPoints.walletAddress, r.walletAddress));
    return {
      walletAddress: r.walletAddress,
      totalPoints: up?.totalPoints || 0,
      periodPoints: Number(r.periodPoints),
      tier: up?.tier || "pill_popper",
      ogNftMint: up?.ogNftMint || null,
    };
  }));

  return attachDisplayNames(enriched);
}

export async function getUserRank(walletAddress: string): Promise<number> {
  const up = await getOrCreateUserPoints(walletAddress);
  const [result] = await db.select({
    rank: sql<number>`COUNT(*) + 1`,
  }).from(userPoints).where(sql`${userPoints.totalPoints} > ${up.totalPoints}`);
  return Number(result?.rank) || 1;
}

export const OG_CARD_PRICE_SOL = 0;
export const OG_CARD_PRICE_LAMPORTS = 0;

function getMainnetConnection() {
  const { Connection } = require("@solana/web3.js");
  const mainnetRpc = process.env.MAINNET_RPC_URL
    || (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : "https://api.mainnet-beta.solana.com");
  return new Connection(mainnetRpc);
}

export function isMintOpen(): boolean {
  return process.env.OG_CARD_MINT_OPEN !== "false";
}

export async function claimOgCard(walletAddress: string, txSignature: string): Promise<{ success: boolean; message: string; points?: number; nftMint?: string }> {
  const up = await getOrCreateUserPoints(walletAddress);
  if (up.ogNftMint) {
    return { success: false, message: "OG Card already claimed" };
  }

  if (!isMintOpen()) {
    return { success: false, message: "OG Card minting is currently closed." };
  }

  const connection = getMainnetConnection();

  const tx = await connection.getTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.meta) {
    return { success: false, message: "Transaction not found or not confirmed. Please wait and try again." };
  }

  if (tx.meta.err) {
    return { success: false, message: "Transaction failed on-chain." };
  }

  const txTime = tx.blockTime ? tx.blockTime * 1000 : 0;
  const now = Date.now();
  if (txTime > 0 && (now - txTime) > 10 * 60 * 1000) {
    return { success: false, message: "Transaction is too old (must be within 10 minutes). Please try again." };
  }

  const platformWallet = process.env.PLATFORM_TREASURY_WALLET || process.env.FEE_RECIPIENT_WALLET || "G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM";
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys ? message.getAccountKeys().staticKeys : (message as any).accountKeys;
  const staticKeys = accountKeys.map((k: any) => k.toBase58 ? k.toBase58() : String(k));

  if (staticKeys[0] !== walletAddress) {
    return { success: false, message: "Transaction sender does not match your wallet." };
  }

  const platformIndex = staticKeys.indexOf(platformWallet);
  if (platformIndex === -1) {
    return { success: false, message: "Transaction does not pay to the platform wallet." };
  }

  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;
  const amountReceived = (postBalances[platformIndex] || 0) - (preBalances[platformIndex] || 0);
  const tolerance = OG_CARD_PRICE_LAMPORTS * 0.05;

  if (amountReceived < OG_CARD_PRICE_LAMPORTS - tolerance) {
    return { success: false, message: `Insufficient payment. Expected ${OG_CARD_PRICE_SOL} SOL, received ${(amountReceived / 1_000_000_000).toFixed(4)} SOL.` };
  }

  let nftMintAddress: string | undefined;

  if (process.env.CROSSMINT_API_KEY && process.env.CROSSMINT_COLLECTION_ID) {
    try {
      const crossmintRes = await fetch(
        `https://www.crossmint.com/api/2022-06-09/collections/${process.env.CROSSMINT_COLLECTION_ID}/nfts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.CROSSMINT_API_KEY,
          },
          body: JSON.stringify({
            recipient: `solana:${walletAddress}`,
            metadata: {
              name: "Dum.fun OG Card",
              symbol: "DUMOG",
              description: "Early supporter of dum.fun. Grants permanent 1.2x points boost and OG status on the leaderboard.",
              image: process.env.OG_CARD_IMAGE_URL || "",
              attributes: [
                { trait_type: "Boost", value: "+20%" },
                { trait_type: "Status", value: "OG" },
                { trait_type: "Minted", value: new Date().toISOString().split("T")[0] },
              ],
            },
          }),
        }
      );

      if (crossmintRes.ok) {
        const crossmintData = await crossmintRes.json();
        nftMintAddress = crossmintData.id || crossmintData.onChain?.mintHash;
        console.log(`[OG Card] Crossmint NFT minted for ${walletAddress}: ${nftMintAddress}`);
      } else {
        const errText = await crossmintRes.text();
        console.error(`[OG Card] Crossmint mint failed: ${errText}`);
      }
    } catch (err) {
      console.error("[OG Card] Crossmint error:", err);
    }
  }

  const ogId = nftMintAddress || `og_${txSignature.slice(0, 16)}_${Date.now()}`;

  await db.update(userPoints)
    .set({ ogNftMint: ogId, ogCardVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  await awardQuest(walletAddress, "mint_og_nft");

  return {
    success: true,
    message: nftMintAddress
      ? "OG Card NFT minted to your wallet! You now earn 1.2x points on all actions."
      : "OG Card activated! You now earn 1.2x points on all actions.",
    points: 500,
    nftMint: ogId,
  };
}

export async function claimOgCardFree(walletAddress: string): Promise<{ success: boolean; message: string; points?: number; nftMint?: string }> {
  const up = await getOrCreateUserPoints(walletAddress);
  if (up.ogNftMint) {
    return { success: false, message: "OG Card already claimed" };
  }
  if (!isMintOpen()) {
    return { success: false, message: "OG Card minting is currently closed." };
  }

  let nftMintAddress: string | undefined;
  if (process.env.CROSSMINT_API_KEY && process.env.CROSSMINT_COLLECTION_ID) {
    try {
      const crossmintRes = await fetch(
        `https://www.crossmint.com/api/2022-06-09/collections/${process.env.CROSSMINT_COLLECTION_ID}/nfts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-KEY": process.env.CROSSMINT_API_KEY },
          body: JSON.stringify({
            recipient: `solana:${walletAddress}`,
            metadata: {
              name: "Dum.fun OG Card",
              symbol: "DUMOG",
              description: "Early supporter of dum.fun. Grants permanent 1.2x points boost and OG status on the leaderboard.",
              image: process.env.OG_CARD_IMAGE_URL || "",
              attributes: [
                { trait_type: "Boost", value: "+20%" },
                { trait_type: "Status", value: "OG" },
                { trait_type: "Minted", value: new Date().toISOString().split("T")[0] },
              ],
            },
          }),
        }
      );
      if (crossmintRes.ok) {
        const d = await crossmintRes.json();
        nftMintAddress = d.id || d.onChain?.mintHash;
      }
    } catch (err) {
      console.error("[OG Card] Crossmint error:", err);
    }
  }

  const ogId = nftMintAddress || `og_free_${walletAddress.slice(0, 8)}_${Date.now()}`;

  await db.update(userPoints)
    .set({ ogNftMint: ogId, ogCardVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  await awardQuest(walletAddress, "mint_og_nft");

  return {
    success: true,
    message: "OG Card activated! You now earn 1.2x points on all actions.",
    points: 500,
    nftMint: ogId,
  };
}
