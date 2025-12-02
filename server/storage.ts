import { type User, type InsertUser, type WalletAnalysis, type InsertWalletAnalysis, type Waitlist, type InsertWaitlist, type Token, type InsertToken, users, tokens, walletAnalysis, waitlist } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
}

export const storage = new DatabaseStorage();
