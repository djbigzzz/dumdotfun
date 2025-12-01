import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeWallet, isValidSolanaAddress } from "./solana";
import { insertWaitlistSchema, insertUserSchema } from "@shared/schema";
import { sendWaitlistConfirmation } from "./email";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create user from wallet connection
  app.post("/api/users/connect", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const isValid = await isValidSolanaAddress(walletAddress);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid Solana wallet address" });
      }

      // Check if user already exists
      const existing = await storage.getUserByWallet(walletAddress);
      if (existing) {
        return res.json(existing);
      }

      // Create new user
      const newUser = await storage.createUser({
        walletAddress,
      });

      return res.json(newUser);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      return res.status(500).json({ error: "Failed to connect wallet" });
    }
  });

  // Get user by wallet
  app.get("/api/users/wallet/:walletAddress", async (req, res) => {
    try {
      const user = await storage.getUserByWallet(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json(user);
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const validation = insertWaitlistSchema.safeParse({ email });
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const isAlreadySignedUp = await storage.isEmailInWaitlist(email);
      if (isAlreadySignedUp) {
        return res.status(400).json({ error: "Email already on waitlist" });
      }

      const result = await storage.addToWaitlist(email);
      
      // Send confirmation email asynchronously (don't wait for it)
      sendWaitlistConfirmation(email).catch((err) =>
        console.error("Failed to send confirmation email:", err)
      );
      
      return res.json({ success: true, message: "Added to waitlist!", result });
    } catch (error: any) {
      console.error("Error adding to waitlist:", error);
      return res.status(500).json({ error: "Failed to add to waitlist" });
    }
  });

  app.post("/api/analyze-wallet", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const isValid = await isValidSolanaAddress(walletAddress);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid Solana wallet address" });
      }

      const cachedAnalysis = await storage.getWalletAnalysis(walletAddress);
      const cacheAge = cachedAnalysis 
        ? Date.now() - new Date(cachedAnalysis.createdAt).getTime()
        : Infinity;
      
      if (cachedAnalysis && cacheAge < 5 * 60 * 1000) {
        return res.json(cachedAnalysis);
      }

      console.log(`Analyzing wallet: ${walletAddress}`);
      const stats = await analyzeWallet(walletAddress);

      const analysis = await storage.createWalletAnalysis({
        walletAddress,
        dumScore: stats.dumScore,
        solLost: stats.solLost,
        rugsHit: stats.rugsHit,
        topRug: stats.topRug,
        totalTransactions: stats.totalTransactions,
        averageLossPerTrade: stats.averageLossPerTrade,
        status: stats.status,
      });

      return res.json({
        ...analysis,
        isRealData: stats.isRealData,
      });
    } catch (error: any) {
      console.error("Error analyzing wallet:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to analyze wallet" 
      });
    }
  });

  return httpServer;
}
