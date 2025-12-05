import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mint: text("mint").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  description: text("description"),
  imageUri: text("image_uri"),
  creatorAddress: text("creator_address").notNull(),
  bondingCurveProgress: real("bonding_curve_progress").notNull().default(0),
  marketCapSol: real("market_cap_sol").notNull().default(0),
  priceInSol: real("price_in_sol").notNull().default(0),
  isGraduated: boolean("is_graduated").notNull().default(false),
  deploymentStatus: text("deployment_status").notNull().default("pending"),
  twitter: text("twitter"),
  telegram: text("telegram"),
  website: text("website"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const walletAnalysis = pgTable("wallet_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  dumScore: integer("dum_score").notNull(),
  solLost: integer("sol_lost").notNull(),
  rugsHit: integer("rugs_hit").notNull(),
  topRug: text("top_rug").notNull(),
  totalTransactions: integer("total_transactions").notNull(),
  averageLossPerTrade: integer("average_loss_per_trade").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const predictionMarkets = pgTable("prediction_markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  description: text("description"),
  imageUri: text("image_uri"),
  creatorAddress: text("creator_address").notNull(),
  marketType: text("market_type").notNull().default("general"),
  tokenMint: text("token_mint"),
  resolutionDate: timestamp("resolution_date").notNull(),
  status: text("status").notNull().default("open"),
  outcome: text("outcome"),
  yesPool: decimal("yes_pool", { precision: 20, scale: 9 }).notNull().default("0"),
  noPool: decimal("no_pool", { precision: 20, scale: 9 }).notNull().default("0"),
  totalVolume: decimal("total_volume", { precision: 20, scale: 9 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  side: text("side").notNull(),
  amount: decimal("amount", { precision: 20, scale: 9 }).notNull(),
  shares: decimal("shares", { precision: 20, scale: 9 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activityFeed = pgTable("activity_feed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityType: text("activity_type").notNull(),
  walletAddress: text("wallet_address"),
  tokenMint: text("token_mint"),
  marketId: varchar("market_id"),
  amount: decimal("amount", { precision: 20, scale: 9 }),
  side: text("side"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).partial({
  referralCode: true,
  referredBy: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  bondingCurveProgress: true,
  marketCapSol: true,
  priceInSol: true,
  isGraduated: true,
  deploymentStatus: true,
}).partial({
  description: true,
  imageUri: true,
  twitter: true,
  telegram: true,
  website: true,
});

export const insertWalletAnalysisSchema = createInsertSchema(walletAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
});

export const insertMarketSchema = createInsertSchema(predictionMarkets).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  yesPool: true,
  noPool: true,
  totalVolume: true,
  status: true,
  outcome: true,
}).partial({
  description: true,
  imageUri: true,
  tokenMint: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activityFeed).omit({
  id: true,
  createdAt: true,
}).partial({
  walletAddress: true,
  tokenMint: true,
  marketId: true,
  amount: true,
  side: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;
export type InsertWalletAnalysis = z.infer<typeof insertWalletAnalysisSchema>;
export type WalletAnalysis = typeof walletAnalysis.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof predictionMarkets.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityFeed.$inferSelect;
