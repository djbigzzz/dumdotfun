import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeWallet, isValidSolanaAddress } from "./solana";
import { insertWaitlistSchema, insertUserSchema, insertTokenSchema, insertMarketSchema, tokens as tokensTable } from "@shared/schema";
import { sendWaitlistConfirmation } from "./email";
import { getTradeQuote, buildBuyTransaction, buildSellTransaction, TRADING_CONFIG, isTradingEnabled } from "./trading";
import { getSolPrice, getTokenPriceInSol } from "./jupiter";
import { Keypair } from "@solana/web3.js";
import { db } from "./db";
import { eq } from "drizzle-orm";

function generateUserReferralCode(walletAddress: string): string {
  const prefix = walletAddress.slice(0, 4).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-3);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/tokens", async (req, res) => {
    try {
      const dbTokens = await db.select().from(tokensTable).limit(24);
      
      const tokensWithPredictions = await Promise.all(
        dbTokens.map(async (token: typeof tokensTable.$inferSelect) => {
          const linkedMarkets = await storage.getMarketsByTokenMint(token.mint);
          const predictions = linkedMarkets.slice(0, 2).map(market => {
            const yesPool = Number(market.yesPool) || 0;
            const noPool = Number(market.noPool) || 0;
            const total = yesPool + noPool;
            return {
              id: market.id,
              question: market.question,
              yesOdds: total > 0 ? Math.round((yesPool / total) * 100) : 50,
              noOdds: total > 0 ? Math.round((noPool / total) * 100) : 50,
              totalVolume: Number(market.totalVolume) || 0,
              status: market.status,
            };
          });
          
          return {
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
            source: "dum.fun",
            predictions,
          };
        })
      );
      
      return res.json(tokensWithPredictions);
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

      const linkedMarkets = await storage.getMarketsByTokenMint(mint);
      const predictions = linkedMarkets.map(market => {
        const yesPool = Number(market.yesPool) || 0;
        const noPool = Number(market.noPool) || 0;
        const total = yesPool + noPool;
        return {
          id: market.id,
          question: market.question,
          description: market.description,
          yesOdds: total > 0 ? Math.round((yesPool / total) * 100) : 50,
          noOdds: total > 0 ? Math.round((noPool / total) * 100) : 50,
          yesPool,
          noPool,
          totalVolume: Number(market.totalVolume) || 0,
          status: market.status,
          resolutionDate: market.resolutionDate,
          createdAt: market.createdAt,
        };
      });

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
        source: "dum.fun",
        predictions,
      });
    } catch (error: any) {
      console.error("Error fetching token:", error);
      return res.status(500).json({ error: "Server error fetching token" });
    }
  });


  app.post("/api/users/connect", async (req, res) => {
    try {
      const { walletAddress, referralCode } = req.body;

      if (!walletAddress || typeof walletAddress !== "string" || walletAddress.length < 32) {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      let existing = await storage.getUserByWallet(walletAddress);
      if (existing) {
        // Ensure existing user has a referral code (backfill for users created before referral system)
        if (!existing.referralCode) {
          const newCode = generateUserReferralCode(walletAddress);
          const updated = await storage.updateUserReferralCode(walletAddress, newCode);
          if (updated) {
            existing = updated;
          }
        }
        const referralCount = await storage.getReferralCount(walletAddress);
        return res.json({ ...existing, referralCount });
      }

      const newUser = await storage.createUserWithReferral(walletAddress, referralCode);
      return res.json({ ...newUser, referralCount: 0 });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      return res.status(500).json({ error: "Failed to connect wallet" });
    }
  });

  app.get("/api/users/wallet/:walletAddress", async (req, res) => {
    try {
      let user = await storage.getUserByWallet(req.params.walletAddress);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Backfill referral code for users created before referral system
      if (!user.referralCode) {
        const newCode = generateUserReferralCode(req.params.walletAddress);
        const updated = await storage.updateUserReferralCode(req.params.walletAddress, newCode);
        if (updated) {
          user = updated;
        }
      }
      const referralCount = await storage.getReferralCount(req.params.walletAddress);
      return res.json({ ...user, referralCount });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/users/referrals/:walletAddress", async (req, res) => {
    try {
      const referralCount = await storage.getReferralCount(req.params.walletAddress);
      const user = await storage.getUserByWallet(req.params.walletAddress);
      return res.json({ 
        referralCount, 
        referralCode: user?.referralCode || null 
      });
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      return res.status(500).json({ error: "Failed to fetch referrals" });
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

  // =====================
  // PREDICTION MARKETS
  // =====================

  // Get all prediction markets
  app.get("/api/markets", async (req, res) => {
    try {
      const markets = await storage.getMarkets(24);
      return res.json(markets.map(m => ({
        ...m,
        yesPool: Number(m.yesPool),
        noPool: Number(m.noPool),
        totalVolume: Number(m.totalVolume),
        yesOdds: calculateOdds(Number(m.yesPool), Number(m.noPool), "yes"),
        noOdds: calculateOdds(Number(m.yesPool), Number(m.noPool), "no"),
      })));
    } catch (error: any) {
      console.error("Error fetching markets:", error);
      return res.status(500).json({ error: "Failed to fetch markets" });
    }
  });

  // Get single market
  app.get("/api/markets/:id", async (req, res) => {
    try {
      const market = await storage.getMarket(req.params.id);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }
      
      const positions = await storage.getPositionsByMarket(market.id);
      
      return res.json({
        ...market,
        yesPool: Number(market.yesPool),
        noPool: Number(market.noPool),
        totalVolume: Number(market.totalVolume),
        yesOdds: calculateOdds(Number(market.yesPool), Number(market.noPool), "yes"),
        noOdds: calculateOdds(Number(market.yesPool), Number(market.noPool), "no"),
        totalPositions: positions.length,
      });
    } catch (error: any) {
      console.error("Error fetching market:", error);
      return res.status(500).json({ error: "Failed to fetch market" });
    }
  });

  // Create prediction market (always linked to a token)
  app.post("/api/markets/create", async (req, res) => {
    try {
      const { question, description, imageUri, creatorAddress, predictionType, tokenMint, resolutionDate } = req.body;

      // Validate required fields
      if (!question || typeof question !== "string" || question.trim().length < 10) {
        return res.status(400).json({ error: "Question must be at least 10 characters" });
      }

      if (!creatorAddress || typeof creatorAddress !== "string") {
        return res.status(400).json({ error: "Creator wallet address is required" });
      }

      if (!resolutionDate) {
        return res.status(400).json({ error: "Resolution date is required" });
      }

      // All predictions must be linked to a token
      if (!tokenMint || typeof tokenMint !== "string" || tokenMint.length < 32) {
        return res.status(400).json({ error: "Token mint address is required" });
      }

      const resolutionTimestamp = new Date(resolutionDate);
      if (isNaN(resolutionTimestamp.getTime()) || resolutionTimestamp <= new Date()) {
        return res.status(400).json({ error: "Resolution date must be in the future" });
      }

      const market = await storage.createMarket({
        question: question.trim(),
        description: description?.trim() || null,
        imageUri: imageUri || null,
        creatorAddress,
        predictionType: predictionType || "custom",
        tokenMint,
        resolutionDate: resolutionTimestamp,
      });

      // Log activity
      await storage.addActivity({
        activityType: "market_created",
        walletAddress: creatorAddress,
        marketId: market.id,
        metadata: JSON.stringify({ question: market.question }),
      });

      console.log(`Market created: "${market.question}" by ${creatorAddress}`);

      return res.json({
        success: true,
        market: {
          ...market,
          yesPool: 0,
          noPool: 0,
          totalVolume: 0,
          yesOdds: 50,
          noOdds: 50,
        },
      });
    } catch (error: any) {
      console.error("Error creating market:", error);
      return res.status(500).json({ error: "Failed to create market" });
    }
  });

  // Place bet on market
  app.post("/api/markets/:id/bet", async (req, res) => {
    try {
      const { id } = req.params;
      const { walletAddress, side, amount } = req.body;

      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "Wallet address is required" });
      }

      if (!side || (side !== "yes" && side !== "no")) {
        return res.status(400).json({ error: "Side must be 'yes' or 'no'" });
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: "Amount must be a positive number" });
      }

      const market = await storage.getMarket(id);
      if (!market) {
        return res.status(404).json({ error: "Market not found" });
      }

      if (market.status !== "open") {
        return res.status(400).json({ error: "Market is closed for betting" });
      }

      if (new Date(market.resolutionDate) <= new Date()) {
        return res.status(400).json({ error: "Market has expired" });
      }

      const amountNum = Number(amount);
      const currentYes = Number(market.yesPool);
      const currentNo = Number(market.noPool);

      // Calculate shares using CPMM formula (simplified)
      const k = (currentYes + 1) * (currentNo + 1); // Add 1 to avoid division by zero
      let newYes = currentYes;
      let newNo = currentNo;
      let shares: number;

      if (side === "yes") {
        newYes = currentYes + amountNum;
        shares = amountNum * (currentNo + 1) / (currentYes + 1); // Simplified share calculation
      } else {
        newNo = currentNo + amountNum;
        shares = amountNum * (currentYes + 1) / (currentNo + 1);
      }

      // Execute bet as single atomic transaction
      const position = await storage.placeBetTransaction(
        id,
        walletAddress,
        side,
        amountNum.toString(),
        shares.toString(),
        newYes.toString(),
        newNo.toString()
      );

      console.log(`Bet placed: ${amountNum} SOL on ${side} for market ${id}`);

      return res.json({
        success: true,
        position,
        newOdds: {
          yes: calculateOdds(newYes, newNo, "yes"),
          no: calculateOdds(newYes, newNo, "no"),
        },
      });
    } catch (error: any) {
      console.error("Error placing bet:", error);
      return res.status(500).json({ error: "Failed to place bet" });
    }
  });

  // Get positions by wallet
  app.get("/api/positions/wallet/:address", async (req, res) => {
    try {
      const positions = await storage.getPositionsByWallet(req.params.address);
      return res.json(positions);
    } catch (error: any) {
      console.error("Error fetching positions:", error);
      return res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  // Get recent activity feed
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const activity = await storage.getRecentActivity(limit);
      return res.json(activity);
    } catch (error: any) {
      console.error("Error fetching activity:", error);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  return httpServer;
}

// Helper function for odds calculation
function calculateOdds(yesPool: number, noPool: number, side: "yes" | "no"): number {
  const total = yesPool + noPool;
  if (total === 0) return 50;
  
  if (side === "yes") {
    return Math.round((yesPool / total) * 100);
  } else {
    return Math.round((noPool / total) * 100);
  }
}

