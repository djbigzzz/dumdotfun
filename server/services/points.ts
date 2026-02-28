import { db } from "../db";
import { userPoints, pointsHistory, users } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const OG_MULTIPLIER = 1.5;

const TIERS = [
  { name: "solana_god", minPoints: 10000, label: "Solana God", emoji: "💎" },
  { name: "rug_proof", minPoints: 5000, label: "Rug Proof", emoji: "🛡️" },
  { name: "degen", minPoints: 2000, label: "Degen", emoji: "🔥" },
  { name: "bonding_curve", minPoints: 500, label: "Bonding Curve", emoji: "📈" },
  { name: "pill_popper", minPoints: 0, label: "Pill Popper", emoji: "💊" },
];

interface QuestDefinition {
  id: string;
  action: string;
  category: "onboarding" | "activity" | "streaks" | "special";
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
  { id: "mint_og_nft", action: "mint_og_nft", category: "special", title: "OG Card", description: "Claim your free OG Card (1.5x boost)", points: 50, repeatable: false },
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
  return { awarded: true, points: result.finalPoints };
}

async function awardReferralBonus(walletAddress: string, pointsEarned: number) {
  const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
  if (!user?.referredBy) return;

  const referrerWallet = user.referredBy;
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

  await awardReferralBonus(walletAddress, dailyResult.finalPoints + streakBonus);

  return { awarded: true, points: dailyResult.finalPoints, streak: newStreak, streakBonus: streakBonus || undefined };
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

  const questList = QUESTS.map(q => ({
    action: q.action,
    points: q.points,
    completed: q.repeatable ? false : completedActions.has(q.id),
    repeatable: q.repeatable,
    category: q.category,
    title: q.title,
    description: q.description,
  }));

  return {
    totalPoints: up.totalPoints,
    tier: up.tier,
    tierLabel: tierInfo.label,
    tierEmoji: tierInfo.emoji,
    nextTier: tierInfo.nextTier ? { name: tierInfo.nextTier.name, label: tierInfo.nextTier.label, minPoints: tierInfo.nextTier.minPoints } : null,
    ogNftMint: up.ogNftMint,
    hasOgCard: !!up.ogNftMint,
    ogBoost: up.ogNftMint ? "50%" : "0%",
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

export async function getLeaderboard(period: "daily" | "weekly" | "all" = "all", limit: number = 50) {
  if (period === "all") {
    return db.select({
      walletAddress: userPoints.walletAddress,
      totalPoints: userPoints.totalPoints,
      tier: userPoints.tier,
      ogNftMint: userPoints.ogNftMint,
    })
      .from(userPoints)
      .orderBy(desc(userPoints.totalPoints))
      .limit(limit);
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

  return enriched;
}

export async function getUserRank(walletAddress: string): Promise<number> {
  const up = await getOrCreateUserPoints(walletAddress);
  const [result] = await db.select({
    rank: sql<number>`COUNT(*) + 1`,
  }).from(userPoints).where(sql`${userPoints.totalPoints} > ${up.totalPoints}`);
  return Number(result?.rank) || 1;
}

export async function claimFreeOgCard(walletAddress: string): Promise<{ success: boolean; message: string; points?: number }> {
  const up = await getOrCreateUserPoints(walletAddress);
  if (up.ogNftMint) {
    return { success: false, message: "OG Card already claimed" };
  }

  const ogId = `og_free_${walletAddress.slice(0, 8)}_${Date.now()}`;

  await db.update(userPoints)
    .set({ ogNftMint: ogId, ogCardVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  const questResult = await awardQuest(walletAddress, "mint_og_nft");

  return {
    success: true,
    message: "OG Card activated! You now earn 1.5x points on all actions.",
    points: questResult.points,
  };
}
