import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeWallet, isValidSolanaAddress } from "./solana";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
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
