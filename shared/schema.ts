import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;
export type InsertWalletAnalysis = z.infer<typeof insertWalletAnalysisSchema>;
export type WalletAnalysis = typeof walletAnalysis.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;
