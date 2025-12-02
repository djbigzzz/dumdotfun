import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeWallet, isValidSolanaAddress } from "./solana";
import { insertWaitlistSchema, insertUserSchema, insertTokenSchema, tokens as tokensTable } from "@shared/schema";
import { sendWaitlistConfirmation } from "./email";
import { getTradeQuote, buildBuyTransaction, buildSellTransaction, TRADING_CONFIG, isTradingEnabled } from "./trading";
import { getSolPrice, getTokenPriceInSol } from "./jupiter";
import { Keypair } from "@solana/web3.js";
import { db } from "./db";
import { eq } from "drizzle-orm";


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/tokens", async (req, res) => {
    try {
      // Fetch tokens created on dum.fun from database
      const dbTokens = await db.select().from(tokensTable).limit(24);
      
      const formattedTokens = dbTokens.map((token: typeof tokensTable.$inferSelect) => ({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        imageUri: token.imageUri,
        bondingCurveProgress: Number(token.bondingCurveProgress) || 0,
        marketCapSol: Number(token.marketCapSol) || 0,
        priceInSol: Number(token.priceInSol) || 0,
        creatorAddress: token.creatorAddress,
        createdAt: token.createdAt?.toISOString() || new Date().toISOString(),
        isGraduated: token.isGraduated,
        source: "dum.fun"
      }));
      
      return res.json(formattedTokens);
    } catch (error: any) {
      console.error("Error fetching tokens:", error);
      return res.status(500).json({ error: "Server error while fetching tokens" });
    }
  });

  app.get("/api/tokens/:mint", async (req, res) => {
    try {
      const { mint } = req.params;
      const token = await db.query.tokens.findFirst({
        where: (tokens) => eq(tokens.mint, mint)
      });
      
      if (!token) {
        return res.status(404).json({ error: "Token not found on dum.fun" });
      }

      return res.json({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        description: token.description || "",
        imageUri: token.imageUri,
        bondingCurveProgress: Number(token.bondingCurveProgress) || 0,
        marketCapSol: Number(token.marketCapSol) || 0,
        priceInSol: Number(token.priceInSol) || 0,
        creatorAddress: token.creatorAddress,
        twitter: token.twitter,
        telegram: token.telegram,
        website: token.website,
        createdAt: token.createdAt?.toISOString() || new Date().toISOString(),
        isGraduated: token.isGraduated,
        source: "dum.fun"
      });
    } catch (error: any) {
      console.error("Error fetching token:", error);
      return res.status(500).json({ error: "Server error fetching token" });
    }
  });

  app.post("/api/users/connect", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 32) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      const existing = await storage.getUserByWallet(walletAddress);
      if (existing) {
        return res.json(existing);
      }

      const newUser = await storage.createUser({
        walletAddress,
      });

      return res.json(newUser);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      return res.status(500).json({ error: "Failed to connect wallet" });
    }
  });

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

  // Price endpoints (Jupiter API)
  app.get("/api/price/sol", async (req, res) => {
    try {
      const price = await getSolPrice();
      if (price === null) {
        return res.status(503).json({ error: "Unable to fetch SOL price" });
      }
      return res.json({ price, currency: "USD" });
    } catch (error) {
      console.error("Error fetching SOL price:", error);
      return res.status(500).json({ error: "Failed to fetch SOL price" });
    }
  });

  app.get("/api/price/token/:mint", async (req, res) => {
    try {
      const { mint } = req.params;
      const priceInSol = await getTokenPriceInSol(mint);
      const solPrice = await getSolPrice();
      
      return res.json({ 
        priceInSol: priceInSol,
        priceInUsd: priceInSol && solPrice ? priceInSol * solPrice : null,
        solPriceUsd: solPrice
      });
    } catch (error) {
      console.error("Error fetching token price:", error);
      return res.status(500).json({ error: "Failed to fetch token price" });
    }
  });

  // Trading endpoints
  app.get("/api/trading/status", async (req, res) => {
    const isReady = isTradingEnabled();
    return res.json({
      tradingEnabled: isReady,
      message: isReady 
        ? "Trading is available" 
        : "Trading coming soon - bonding curve contract not yet deployed",
      programId: isReady ? TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID : null,
    });
  });

  app.post("/api/trading/quote", async (req, res) => {
    try {
      const { userWallet, tokenMint, amount, isBuy } = req.body;

      if (!userWallet || !tokenMint || !amount) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const result = await getTradeQuote({
        userWallet,
        tokenMint,
        amount: amount.toString(),
        isBuy: isBuy === true,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Error getting quote:", error);
      return res.status(500).json({ error: "Failed to get quote" });
    }
  });

  app.post("/api/trading/buy", async (req, res) => {
    try {
      const { userWallet, tokenMint, amount, slippageBps } = req.body;

      if (!userWallet || !tokenMint || !amount) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const result = await buildBuyTransaction({
        userWallet,
        tokenMint,
        amount: amount.toString(),
        slippageBps,
        isBuy: true,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Error building buy transaction:", error);
      return res.status(500).json({ error: "Failed to build transaction" });
    }
  });

  app.post("/api/trading/sell", async (req, res) => {
    try {
      const { userWallet, tokenMint, amount, slippageBps } = req.body;

      if (!userWallet || !tokenMint || !amount) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const result = await buildSellTransaction({
        userWallet,
        tokenMint,
        amount: amount.toString(),
        slippageBps,
        isBuy: false,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("Error building sell transaction:", error);
      return res.status(500).json({ error: "Failed to build transaction" });
    }
  });

  // Token creation endpoint
  app.post("/api/tokens/create", async (req, res) => {
    try {
      const { name, symbol, description, imageUri, twitter, telegram, website, creatorAddress } = req.body;

      // Validate required fields
      if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 32) {
        return res.status(400).json({ error: "Name is required (max 32 characters)" });
      }

      if (!symbol || typeof symbol !== "string" || symbol.trim().length === 0 || symbol.length > 10) {
        return res.status(400).json({ error: "Symbol is required (max 10 characters)" });
      }

      if (!creatorAddress || typeof creatorAddress !== "string" || creatorAddress.length === 0) {
        return res.status(400).json({ error: "Creator wallet address is required" });
      }

      // Generate a new keypair for the token mint
      // In production, this would be done on-chain with user signing
      const mintKeypair = Keypair.generate();
      const mint = mintKeypair.publicKey.toBase58();

      // Create token in database
      const token = await storage.createToken({
        mint,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description?.trim() || null,
        imageUri: imageUri || null,
        creatorAddress,
        twitter: twitter?.trim() || null,
        telegram: telegram?.trim() || null,
        website: website?.trim() || null,
      });

      console.log(`Token metadata saved: ${token.name} (${token.symbol}) - ${token.mint}`);

      return res.json({
        success: true,
        token,
        deploymentStatus: "pending",
        message: "Token metadata saved! On-chain deployment will be available once bonding curve contract is deployed.",
      });
    } catch (error: any) {
      console.error("Error creating token:", error);
      return res.status(500).json({ error: "Failed to create token" });
    }
  });

  // Get tokens created by a wallet
  app.get("/api/tokens/creator/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      const isValid = await isValidSolanaAddress(address);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const tokens = await storage.getTokensByCreator(address);
      return res.json(tokens);
    } catch (error: any) {
      console.error("Error fetching creator tokens:", error);
      return res.status(500).json({ error: "Failed to fetch tokens" });
    }
  });

  return httpServer;
}

