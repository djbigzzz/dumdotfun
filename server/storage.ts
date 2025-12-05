import { type User, type InsertUser, type WalletAnalysis, type InsertWalletAnalysis, type Waitlist, type InsertWaitlist, type Token, type InsertToken, type Market, type InsertMarket, type Position, type InsertPosition, type Activity, type InsertActivity, users, tokens, walletAnalysis, waitlist, predictionMarkets, positions, activityFeed } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createUserWithReferral(walletAddress: string, referredByCode?: string): Promise<User>;
  getReferralCount(walletAddress: string): Promise<number>;
  updateUserReferralCode(walletAddress: string, referralCode: string): Promise<User | undefined>;
  
  // Token methods
  createToken(token: InsertToken): Promise<Token>;
  getTokenByMint(mint: string): Promise<Token | undefined>;
  getTokensByCreator(creatorAddress: string): Promise<Token[]>;
  
  // Wallet analysis methods
  getWalletAnalysis(walletAddress: string): Promise<WalletAnalysis | undefined>;
  createWalletAnalysis(analysis: InsertWalletAnalysis): Promise<WalletAnalysis>;
  
  // Waitlist methods
  addToWaitlist(email: string): Promise<Waitlist>;
  isEmailInWaitlist(email: string): Promise<boolean>;
  
  // Prediction market methods
  createMarket(market: InsertMarket): Promise<Market>;
  getMarket(id: string): Promise<Market | undefined>;
  getMarkets(limit?: number): Promise<Market[]>;
  getMarketsByCreator(creatorAddress: string): Promise<Market[]>;
  getMarketsByTokenMint(tokenMint: string): Promise<Market[]>;
  getGeneralMarkets(limit?: number): Promise<Market[]>;
  updateMarketPools(id: string, yesPool: string, noPool: string, volumeAdd: string): Promise<Market | undefined>;
  resolveMarket(id: string, outcome: string): Promise<Market | undefined>;
  
  // Position methods
  createPosition(position: InsertPosition): Promise<Position>;
  getPositionsByMarket(marketId: string): Promise<Position[]>;
  getPositionsByWallet(walletAddress: string): Promise<Position[]>;
  
  // Activity feed methods
  addActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivity(limit?: number): Promise<Activity[]>;
  
  // Transactional operations
  placeBetTransaction(
    marketId: string,
    walletAddress: string,
    side: "yes" | "no",
    amount: string,
    shares: string,
    newYesPool: string,
    newNoPool: string
  ): Promise<Position>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode));
    return user || undefined;
  }

  async createUserWithReferral(walletAddress: string, referredByCode?: string): Promise<User> {
    const referralCode = this.generateReferralCode(walletAddress);
    let referredBy: string | null = null;
    
    if (referredByCode) {
      const referrer = await this.getUserByReferralCode(referredByCode);
      if (referrer) {
        referredBy = referrer.walletAddress;
      }
    }
    
    const [user] = await db.insert(users).values({
      walletAddress,
      referralCode,
      referredBy,
    }).returning();
    return user;
  }

  async getReferralCount(walletAddress: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.referredBy, walletAddress));
    return Number(result[0]?.count) || 0;
  }

  async updateUserReferralCode(walletAddress: string, referralCode: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ referralCode })
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    return user || undefined;
  }

  private generateReferralCode(walletAddress: string): string {
    const prefix = walletAddress.slice(0, 4).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
  }

  async getWalletAnalysis(walletAddress: string): Promise<WalletAnalysis | undefined> {
    const [analysis] = await db.select().from(walletAnalysis).where(eq(walletAnalysis.walletAddress, walletAddress));
    return analysis || undefined;
  }

  async createWalletAnalysis(insertAnalysis: InsertWalletAnalysis): Promise<WalletAnalysis> {
    const [analysis] = await db.insert(walletAnalysis).values(insertAnalysis).returning();
    return analysis;
  }

  async addToWaitlist(email: string): Promise<Waitlist> {
    const [entry] = await db.insert(waitlist).values({ email }).returning();
    return entry;
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return !!entry;
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const [token] = await db.insert(tokens).values({
      ...insertToken,
      description: insertToken.description ?? null,
      imageUri: insertToken.imageUri ?? null,
      twitter: insertToken.twitter ?? null,
      telegram: insertToken.telegram ?? null,
      website: insertToken.website ?? null,
      bondingCurveProgress: 0,
      marketCapSol: 0,
      priceInSol: 0.000001,
      isGraduated: false,
    }).returning();
    return token;
  }

  async getTokenByMint(mint: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.mint, mint));
    return token || undefined;
  }

  async getTokensByCreator(creatorAddress: string): Promise<Token[]> {
    return db.select().from(tokens).where(eq(tokens.creatorAddress, creatorAddress));
  }

  async createMarket(insertMarket: InsertMarket): Promise<Market> {
    const [market] = await db.insert(predictionMarkets).values({
      ...insertMarket,
      description: insertMarket.description ?? null,
      imageUri: insertMarket.imageUri ?? null,
      tokenMint: insertMarket.tokenMint ?? null,
      status: "open",
      yesPool: "0",
      noPool: "0",
      totalVolume: "0",
    }).returning();
    return market;
  }

  async getMarket(id: string): Promise<Market | undefined> {
    const [market] = await db.select().from(predictionMarkets).where(eq(predictionMarkets.id, id));
    return market || undefined;
  }

  async getMarkets(limit: number = 24): Promise<Market[]> {
    return db.select().from(predictionMarkets).orderBy(desc(predictionMarkets.createdAt)).limit(limit);
  }

  async getMarketsByCreator(creatorAddress: string): Promise<Market[]> {
    return db.select().from(predictionMarkets).where(eq(predictionMarkets.creatorAddress, creatorAddress));
  }

  async getMarketsByTokenMint(tokenMint: string): Promise<Market[]> {
    return db.select().from(predictionMarkets)
      .where(eq(predictionMarkets.tokenMint, tokenMint))
      .orderBy(desc(predictionMarkets.createdAt));
  }

  async getGeneralMarkets(limit: number = 24): Promise<Market[]> {
    return db.select().from(predictionMarkets)
      .where(sql`${predictionMarkets.marketType} = 'general' OR ${predictionMarkets.tokenMint} IS NULL`)
      .orderBy(desc(predictionMarkets.createdAt))
      .limit(limit);
  }

  async updateMarketPools(id: string, yesPool: string, noPool: string, volumeAdd: string): Promise<Market | undefined> {
    const [market] = await db.update(predictionMarkets)
      .set({ 
        yesPool, 
        noPool,
        totalVolume: sql`${predictionMarkets.totalVolume}::numeric + ${volumeAdd}::numeric`
      })
      .where(eq(predictionMarkets.id, id))
      .returning();
    return market || undefined;
  }

  async resolveMarket(id: string, outcome: string): Promise<Market | undefined> {
    const [market] = await db.update(predictionMarkets)
      .set({ 
        status: "resolved",
        outcome,
        resolvedAt: new Date()
      })
      .where(eq(predictionMarkets.id, id))
      .returning();
    return market || undefined;
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const [position] = await db.insert(positions).values(insertPosition).returning();
    return position;
  }

  async getPositionsByMarket(marketId: string): Promise<Position[]> {
    return db.select().from(positions).where(eq(positions.marketId, marketId));
  }

  async getPositionsByWallet(walletAddress: string): Promise<Position[]> {
    return db.select().from(positions).where(eq(positions.walletAddress, walletAddress));
  }

  async addActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activityFeed).values({
      ...insertActivity,
      walletAddress: insertActivity.walletAddress ?? null,
      tokenMint: insertActivity.tokenMint ?? null,
      marketId: insertActivity.marketId ?? null,
      amount: insertActivity.amount ?? null,
      side: insertActivity.side ?? null,
      metadata: insertActivity.metadata ?? null,
    }).returning();
    return activity;
  }

  async getRecentActivity(limit: number = 50): Promise<Activity[]> {
    return db.select().from(activityFeed).orderBy(desc(activityFeed.createdAt)).limit(limit);
  }

  async placeBetTransaction(
    marketId: string,
    walletAddress: string,
    side: "yes" | "no",
    amount: string,
    shares: string,
    newYesPool: string,
    newNoPool: string
  ): Promise<Position> {
    return await db.transaction(async (tx) => {
      await tx.update(predictionMarkets)
        .set({ 
          yesPool: newYesPool, 
          noPool: newNoPool,
          totalVolume: sql`${predictionMarkets.totalVolume}::numeric + ${amount}::numeric`
        })
        .where(eq(predictionMarkets.id, marketId));

      const [position] = await tx.insert(positions).values({
        marketId,
        walletAddress,
        side,
        amount,
        shares,
      }).returning();

      await tx.insert(activityFeed).values({
        activityType: "bet_placed",
        walletAddress,
        marketId,
        amount,
        side,
        metadata: JSON.stringify({ shares }),
      });

      return position;
    });
  }
}

export const storage = new DatabaseStorage();
