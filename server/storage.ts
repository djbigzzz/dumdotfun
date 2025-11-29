import { type User, type InsertUser, type WalletAnalysis, type InsertWalletAnalysis } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wallet analysis methods
  getWalletAnalysis(walletAddress: string): Promise<WalletAnalysis | undefined>;
  createWalletAnalysis(analysis: InsertWalletAnalysis): Promise<WalletAnalysis>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private walletAnalyses: Map<string, WalletAnalysis>;

  constructor() {
    this.users = new Map();
    this.walletAnalyses = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWalletAnalysis(walletAddress: string): Promise<WalletAnalysis | undefined> {
    return Array.from(this.walletAnalyses.values()).find(
      (analysis) => analysis.walletAddress === walletAddress
    );
  }

  async createWalletAnalysis(insertAnalysis: InsertWalletAnalysis): Promise<WalletAnalysis> {
    const id = randomUUID();
    const now = new Date();
    const analysis: WalletAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: now,
    };
    this.walletAnalyses.set(id, analysis);
    return analysis;
  }
}

export const storage = new MemStorage();
