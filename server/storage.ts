import { type User, type InsertUser, type WalletAnalysis, type InsertWalletAnalysis, type Waitlist, type InsertWaitlist } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateReferralCount(userId: string): Promise<void>;
  getLeaderboard(): Promise<User[]>;
  
  // Wallet analysis methods
  getWalletAnalysis(walletAddress: string): Promise<WalletAnalysis | undefined>;
  createWalletAnalysis(analysis: InsertWalletAnalysis): Promise<WalletAnalysis>;
  
  // Waitlist methods
  addToWaitlist(email: string): Promise<Waitlist>;
  isEmailInWaitlist(email: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private walletAddressToUser: Map<string, string>;
  private walletAnalyses: Map<string, WalletAnalysis>;
  private waitlistEmails: Set<string>;

  constructor() {
    this.users = new Map();
    this.walletAddressToUser = new Map();
    this.walletAnalyses = new Map();
    this.waitlistEmails = new Set();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const userId = this.walletAddressToUser.get(walletAddress);
    return userId ? this.users.get(userId) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      referralCount: 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    this.walletAddressToUser.set(insertUser.walletAddress, id);
    return user;
  }

  async updateReferralCount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.referralCount += 1;
    }
  }

  async getLeaderboard(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 100);
  }

  async getWalletAnalysis(walletAddress: string): Promise<WalletAnalysis | undefined> {
    return this.walletAnalyses.get(walletAddress);
  }

  async createWalletAnalysis(insertAnalysis: InsertWalletAnalysis): Promise<WalletAnalysis> {
    const id = randomUUID();
    const now = new Date();
    const analysis: WalletAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: now,
    };
    this.walletAnalyses.set(insertAnalysis.walletAddress, analysis);
    return analysis;
  }

  async addToWaitlist(email: string): Promise<Waitlist> {
    const id = randomUUID();
    const now = new Date();
    this.waitlistEmails.add(email);
    return {
      id,
      email,
      createdAt: now,
    };
  }

  async isEmailInWaitlist(email: string): Promise<boolean> {
    return this.waitlistEmails.has(email);
  }
}

export const storage = new MemStorage();
