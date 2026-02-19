import { db } from "../db";
import { userPoints, pointsHistory, users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

const QUEST_POINTS: Record<string, number> = {
  connect_wallet: 10,
  first_token: 100,
  first_market: 200,
  first_trade: 25,
  first_bet: 50,
  first_win: 150,
  mint_og_nft: 50,
  daily_login: 10,
};

const TIERS = [
  { name: "diamond", minPoints: 10000 },
  { name: "gold", minPoints: 2000 },
  { name: "silver", minPoints: 500 },
  { name: "bronze", minPoints: 0 },
];

const REFERRAL_PERCENT = 0.1;
const OG_MULTIPLIER = 1.5;

function calculateTier(points: number): string {
  for (const tier of TIERS) {
    if (points >= tier.minPoints) return tier.name;
  }
  return "bronze";
}

async function getOrCreateUserPoints(walletAddress: string) {
  const [existing] = await db.select().from(userPoints).where(eq(userPoints.walletAddress, walletAddress));
  if (existing) return existing;

  const [created] = await db.insert(userPoints).values({ walletAddress }).returning();
  return created;
}

async function hasCompletedQuest(walletAddress: string, action: string): Promise<boolean> {
  const [entry] = await db.select().from(pointsHistory)
    .where(sql`${pointsHistory.walletAddress} = ${walletAddress} AND ${pointsHistory.action} = ${action}`)
    .limit(1);
  return !!entry;
}

async function hasOgNft(walletAddress: string): Promise<boolean> {
  const up = await getOrCreateUserPoints(walletAddress);
  return !!up.ogNftMint;
}

async function awardPointsInternal(walletAddress: string, action: string, basePoints: number, referralSource?: string) {
  const ogHolder = await hasOgNft(walletAddress);
  const finalPoints = ogHolder ? Math.floor(basePoints * OG_MULTIPLIER) : basePoints;

  await db.insert(pointsHistory).values({
    walletAddress,
    action,
    points: finalPoints,
    referralSource: referralSource || null,
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

  await awardReferralBonus(walletAddress, finalPoints);

  return finalPoints;
}

async function awardReferralBonus(walletAddress: string, pointsEarned: number) {
  const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
  if (!user?.referredBy) return;

  const referrerWallet = user.referredBy;
  const referrerUp = await getOrCreateUserPoints(referrerWallet);
  const bonusPoints = Math.floor(pointsEarned * REFERRAL_PERCENT);
  if (bonusPoints <= 0) return;

  await db.insert(pointsHistory).values({
    walletAddress: referrerWallet,
    action: "referral_bonus",
    points: bonusPoints,
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

export async function awardQuest(walletAddress: string, action: string): Promise<{ awarded: boolean; points: number }> {
  if (action === "daily_login") {
    return awardDailyLogin(walletAddress);
  }

  const basePoints = QUEST_POINTS[action];
  if (!basePoints) return { awarded: false, points: 0 };

  await getOrCreateUserPoints(walletAddress);

  const already = await hasCompletedQuest(walletAddress, action);
  if (already) return { awarded: false, points: 0 };

  const finalPoints = await awardPointsInternal(walletAddress, action, basePoints);
  return { awarded: true, points: finalPoints };
}

export async function awardDailyLogin(walletAddress: string): Promise<{ awarded: boolean; points: number }> {
  const up = await getOrCreateUserPoints(walletAddress);

  if (up.lastDailyLogin) {
    const hoursSinceLast = (Date.now() - new Date(up.lastDailyLogin).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) return { awarded: false, points: 0 };
  }

  await db.update(userPoints)
    .set({ lastDailyLogin: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  const finalPoints = await awardPointsInternal(walletAddress, "daily_login", QUEST_POINTS.daily_login);
  return { awarded: true, points: finalPoints };
}

export async function getUserPointsData(walletAddress: string) {
  const up = await getOrCreateUserPoints(walletAddress);
  const history = await db.select().from(pointsHistory)
    .where(eq(pointsHistory.walletAddress, walletAddress))
    .orderBy(desc(pointsHistory.createdAt))
    .limit(50);

  const completedQuests: string[] = [];
  const questActions = ["connect_wallet", "first_token", "first_market", "first_trade", "first_bet", "first_win", "mint_og_nft"];
  for (const action of questActions) {
    const done = await hasCompletedQuest(walletAddress, action);
    if (done) completedQuests.push(action);
  }

  return {
    totalPoints: up.totalPoints,
    tier: up.tier,
    ogNftMint: up.ogNftMint,
    lastDailyLogin: up.lastDailyLogin,
    completedQuests,
    history,
    questDefinitions: Object.entries(QUEST_POINTS).map(([action, points]) => ({
      action,
      points,
      completed: completedQuests.includes(action),
      repeatable: action === "daily_login",
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
      tier: up?.tier || "bronze",
      ogNftMint: up?.ogNftMint || null,
    };
  }));

  return enriched;
}

export async function setOgNftMint(walletAddress: string, mintAddress: string) {
  await getOrCreateUserPoints(walletAddress);
  await db.update(userPoints)
    .set({ ogNftMint: mintAddress, updatedAt: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  return awardQuest(walletAddress, "mint_og_nft");
}

export async function getUserRank(walletAddress: string): Promise<number> {
  const up = await getOrCreateUserPoints(walletAddress);
  const [result] = await db.select({
    rank: sql<number>`COUNT(*) + 1`,
  }).from(userPoints).where(sql`${userPoints.totalPoints} > ${up.totalPoints}`);
  return Number(result?.rank) || 1;
}
