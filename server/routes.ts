import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWalletAnalysisSchema } from "@shared/schema";
import { z } from "zod";

// Utility function to generate deterministic mock stats based on wallet address
function generateMockStats(address: string) {
  const seed = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    return min + ((x - Math.floor(x)) * (max - min));
  };

  const solLost = Math.floor(random(1, 500) * 10);
  const rugsHit = Math.floor(random(1, 50));
  const dumScore = Math.floor(solLost * 100 + rugsHit * 500);
  const rugNames = ["SafeMoon", "ElonSperm", "DogeMeme", "CatShit", "MoonLambo", "SafeShib"];
  const topRug = rugNames[Math.floor(random(0, rugNames.length))];

  return {
    dumScore,
    solLost,
    rugsHit,
    topRug,
    totalTransactions: Math.floor(random(10, 500)),
    averageLossPerTrade: Math.floor((solLost / rugsHit) * 100),
    status: dumScore > 50000 ? "PERMA-REKT" : dumScore > 25000 ? "SEVERELY REKT" : dumScore > 10000 ? "REKT" : "SLIGHTLY REKT",
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/analyze-wallet", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      // Validate wallet address format (Solana addresses are 44 characters base58)
      if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 32) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      // Check if we already have cached analysis for this wallet
      const existingAnalysis = await storage.getWalletAnalysis(walletAddress);
      if (existingAnalysis) {
        return res.json(existingAnalysis);
      }

      // Generate mock stats
      const stats = generateMockStats(walletAddress);

      // Create and store the analysis
      const analysis = await storage.createWalletAnalysis({
        walletAddress,
        ...stats,
      });

      return res.json(analysis);
    } catch (error) {
      console.error("Error analyzing wallet:", error);
      return res.status(500).json({ error: "Failed to analyze wallet" });
    }
  });

  return httpServer;
}
