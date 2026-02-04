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
  priceInSol: real("price_in_sol").notNull().default(0.000001),
  isGraduated: boolean("is_graduated").notNull().default(false),
  deploymentStatus: text("deployment_status").notNull().default("pending"),
  twitter: text("twitter"),
  telegram: text("telegram"),
  website: text("website"),
  virtualSolReserves: text("virtual_sol_reserves").notNull().default("30"),
  virtualTokenReserves: text("virtual_token_reserves").notNull().default("800000000"),
  realSolReserves: text("real_sol_reserves").notNull().default("0"),
  realTokenReserves: text("real_token_reserves").notNull().default("800000000"),
  totalSupply: text("total_supply").notNull().default("1000000000"),
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
  userType: text("user_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const predictionMarkets = pgTable("prediction_markets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  description: text("description"),
  imageUri: text("image_uri"),
  creatorAddress: text("creator_address").notNull(),
  predictionType: text("prediction_type").notNull().default("custom"),
  tokenMint: text("token_mint").notNull(),
  resolutionDate: timestamp("resolution_date").notNull(),
  status: text("status").notNull().default("open"),
  outcome: text("outcome"),
  yesPool: decimal("yes_pool", { precision: 20, scale: 9 }).notNull().default("0"),
  noPool: decimal("no_pool", { precision: 20, scale: 9 }).notNull().default("0"),
  totalVolume: decimal("total_volume", { precision: 20, scale: 9 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolutionType: text("resolution_type").notNull().default("survival"),
  survivalCriteria: text("survival_criteria").default("token_exists"),
  resolutionSource: text("resolution_source"),
  autoResolve: boolean("auto_resolve").notNull().default(true),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  marketId: varchar("market_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  side: text("side").notNull(),
  amount: decimal("amount", { precision: 20, scale: 9 }).notNull(),
  shares: decimal("shares", { precision: 20, scale: 9 }).notNull(),
  isConfidential: boolean("is_confidential").notNull().default(false),
  encryptedAmount: text("encrypted_amount"),
  commitment: text("commitment"),
  nonce: text("nonce"),
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

export const tokenHoldings = pgTable("token_holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  tokenMint: text("token_mint").notNull(),
  balance: decimal("balance", { precision: 20, scale: 9 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenMint: text("token_mint").notNull(),
  walletAddress: text("wallet_address").notNull(),
  tradeType: text("trade_type").notNull(),
  solAmount: decimal("sol_amount", { precision: 20, scale: 9 }).notNull(),
  tokenAmount: decimal("token_amount", { precision: 20, scale: 9 }).notNull(),
  pricePerToken: decimal("price_per_token", { precision: 20, scale: 12 }).notNull(),
  feeAmount: decimal("fee_amount", { precision: 20, scale: 9 }).notNull(),
  txSignature: text("tx_signature"),
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
  predictionType: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  createdAt: true,
}).partial({
  isConfidential: true,
  encryptedAmount: true,
  commitment: true,
  nonce: true,
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

// Private deposits - tracks on-chain deposits to ShadowWire pool for hackathon demo
export const privateDeposits = pgTable("private_deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  amount: real("amount").notNull(),
  token: text("token").notNull().default("SOL"),
  signature: text("signature").notNull().unique(), // On-chain tx signature
  poolAddress: text("pool_address").notNull(),
  verified: boolean("verified").notNull().default(false), // Set true after on-chain verification
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Pool balances - tracks user balances in the privacy pool
export const poolBalances = pgTable("pool_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  solBalance: real("sol_balance").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Pool transfers - internal transfers between pool balances (amount hidden - no on-chain record)
export const poolTransfers = pgTable("pool_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderAddress: text("sender_address").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  amount: real("amount").notNull(),
  token: text("token").notNull().default("SOL"),
  transferType: text("transfer_type").notNull().default("internal"), // internal (amount hidden) or external (sender hidden)
  commitment: text("commitment"), // ZK commitment hash for verification
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrivateDepositSchema = createInsertSchema(privateDeposits).omit({
  id: true,
  createdAt: true,
  verified: true,
});

export type InsertPrivateDeposit = z.infer<typeof insertPrivateDepositSchema>;
export type PrivateDeposit = typeof privateDeposits.$inferSelect;

// Privacy activity log - persists across sessions
export const privacyActivity = pgTable("privacy_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  activityType: text("activity_type").notNull(), // shadowwire, stealth, token2022, arcium, deposit, withdraw
  description: text("description").notNull(),
  amount: real("amount"),
  token: text("token"),
  status: text("status").notNull(), // success, pending, failed
  txSignature: text("tx_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrivacyActivitySchema = createInsertSchema(privacyActivity).omit({
  id: true,
  createdAt: true,
});

export type InsertPrivacyActivity = z.infer<typeof insertPrivacyActivitySchema>;
export type PrivacyActivity = typeof privacyActivity.$inferSelect;

// Stealth addresses - persisted across sessions
export const stealthAddresses = pgTable("stealth_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  stealthAddress: text("stealth_address").notNull(),
  ephemeralPublicKey: text("ephemeral_public_key").notNull(),
  viewTag: text("view_tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStealthAddressSchema = createInsertSchema(stealthAddresses).omit({
  id: true,
  createdAt: true,
});

export type InsertStealthAddress = z.infer<typeof insertStealthAddressSchema>;
export type StealthAddress = typeof stealthAddresses.$inferSelect;

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
