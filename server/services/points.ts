import { db } from "../db";
import { userPoints, pointsHistory, users } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

const QUEST_POINTS: Record<string, number> = {
  connect_wallet: 50,
  first_trade: 100,
  first_bet: 100,
  first_token: 500,
  first_market: 300,
  first_win: 200,
  daily_login: 10,
  streak_7: 150,
  streak_30: 600,
  mint_og_nft: 50,
};

const TIERS = [
  { name: "solana_god", minPoints: 10000 },
  { name: "rug_proof", minPoints: 5000 },
  { name: "degen", minPoints: 2000 },
  { name: "bonding_curve", minPoints: 500 },
  { name: "pill_popper", minPoints: 0 },
];

const REFERRAL_PERCENT = 0.1;
const OG_MULTIPLIER = 1.5;

function calculateTier(points: number): string {
  for (const tier of TIERS) {
    if (points >= tier.minPoints) return tier.name;
  }
  return "pill_popper";
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

export async function awardDailyLogin(walletAddress: string): Promise<{ awarded: boolean; points: number; streak?: number }> {
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
    .set({
      lastDailyLogin: now,
      streak: newStreak,
      lastStreakDate: now,
    })
    .where(eq(userPoints.walletAddress, walletAddress));

  const finalPoints = await awardPointsInternal(walletAddress, "daily_login", QUEST_POINTS.daily_login);

  if (newStreak === 7) {
    const alreadyGot7 = await hasCompletedQuest(walletAddress, "streak_7");
    if (!alreadyGot7) {
      await awardPointsInternal(walletAddress, "streak_7", QUEST_POINTS.streak_7);
    }
  }
  if (newStreak === 30) {
    const alreadyGot30 = await hasCompletedQuest(walletAddress, "streak_30");
    if (!alreadyGot30) {
      await awardPointsInternal(walletAddress, "streak_30", QUEST_POINTS.streak_30);
    }
  }

  return { awarded: true, points: finalPoints, streak: newStreak };
}

export async function getUserPointsData(walletAddress: string) {
  const up = await getOrCreateUserPoints(walletAddress);
  const history = await db.select().from(pointsHistory)
    .where(eq(pointsHistory.walletAddress, walletAddress))
    .orderBy(desc(pointsHistory.createdAt))
    .limit(50);

  const completedQuests: string[] = [];
  const questActions = Object.keys(QUEST_POINTS).filter(a => a !== "daily_login");
  for (const action of questActions) {
    const done = await hasCompletedQuest(walletAddress, action);
    if (done) completedQuests.push(action);
  }

  const dailyDone = up.lastDailyLogin && isSameDay(new Date(up.lastDailyLogin), new Date());

  return {
    totalPoints: up.totalPoints,
    tier: up.tier,
    ogNftMint: up.ogNftMint,
    lastDailyLogin: up.lastDailyLogin,
    streak: up.streak,
    completedQuests,
    history,
    questDefinitions: Object.entries(QUEST_POINTS).map(([action, points]) => ({
      action,
      points,
      completed: action === "daily_login" ? !!dailyDone : completedQuests.includes(action),
      repeatable: action === "daily_login",
      category: getQuestCategory(action),
    })),
  };
}

function getQuestCategory(action: string): string {
  if (["connect_wallet", "first_trade", "first_bet"].includes(action)) return "onboarding";
  if (["first_token", "first_market", "first_win"].includes(action)) return "activity";
  if (["daily_login", "streak_7", "streak_30"].includes(action)) return "streaks";
  if (["mint_og_nft"].includes(action)) return "special";
  return "other";
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

export async function setOgNftMint(walletAddress: string, mintAddress: string) {
  await getOrCreateUserPoints(walletAddress);
  await db.update(userPoints)
    .set({ ogNftMint: mintAddress, updatedAt: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  return awardQuest(walletAddress, "mint_og_nft");
}

export const OG_CARD_PRICE_SOL = 0.2;
export const OG_CARD_PRICE_LAMPORTS = OG_CARD_PRICE_SOL * 1_000_000_000;

export async function claimOgCard(walletAddress: string, txSignature: string): Promise<{ success: boolean; message: string; points?: number }> {
  const up = await getOrCreateUserPoints(walletAddress);
  if (up.ogNftMint) {
    return { success: false, message: "OG Card already claimed" };
  }

  const { Connection, PublicKey } = await import("@solana/web3.js");
  const { getHeliusRpcUrl } = await import("../helius-rpc");
  const connection = new Connection(getHeliusRpcUrl());

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

  const platformWallet = process.env.FEE_RECIPIENT_WALLET || "G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM";
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys ? message.getAccountKeys().staticKeys : (message as any).accountKeys;
  const staticKeys = accountKeys.map((k: any) => k.toBase58 ? k.toBase58() : String(k));

  const senderIndex = 0;
  const senderKey = staticKeys[senderIndex];
  if (senderKey !== walletAddress) {
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

  const ogId = `og_${txSignature.slice(0, 16)}_${Date.now()}`;
  await db.update(userPoints)
    .set({ ogNftMint: ogId, updatedAt: new Date() })
    .where(eq(userPoints.walletAddress, walletAddress));

  const result = await awardQuest(walletAddress, "mint_og_nft");
  return { success: true, message: "OG Card minted! You now earn 1.5x points on all actions.", points: result.points };
}

export async function getUserRank(walletAddress: string): Promise<number> {
  const up = await getOrCreateUserPoints(walletAddress);
  const [result] = await db.select({
    rank: sql<number>`COUNT(*) + 1`,
  }).from(userPoints).where(sql`${userPoints.totalPoints} > ${up.totalPoints}`);
  return Number(result?.rank) || 1;
}
