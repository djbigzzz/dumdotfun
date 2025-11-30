import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta, ConfirmedSignatureInfo } from "@solana/web3.js";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC, "confirmed");

const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";

interface WalletAnalysisResult {
  dumScore: number;
  solLost: number;
  rugsHit: number;
  topRug: string;
  totalTransactions: number;
  averageLossPerTrade: number;
  status: string;
  isRealData: boolean;
  unrealizedLosses?: number;
  tokensAnalyzed?: number;
  transactionsScanned?: number;
}

interface TokenHolding {
  mint: string;
  amount: number;
  costBasisSOL: number;
  currentValueSOL: number;
}

interface TokenPrice {
  price: number;
  priceInSOL: number;
}

const KNOWN_TOKENS: Record<string, string> = {
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": "POPCAT",
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "WIF",
  "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN": "MYRO",
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": "PYTH",
  "So11111111111111111111111111111111111111112": "SOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
};

const KNOWN_RUG_PATTERNS = [
  "pump.fun", "moonshot", "safe", "elon", "doge", "shib", "inu", "moon", "rocket"
];

const DEX_PROGRAM_IDS = [
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",  // Jupiter
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  // Pump.fun
];

function getTokenName(mint: string): string {
  return KNOWN_TOKENS[mint] || `${mint.slice(0, 6)}...${mint.slice(-4)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 1000): Promise<T | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
        console.log(`Rate limited, waiting ${delayMs * (i + 1)}ms...`);
        await delay(delayMs * (i + 1));
      } else {
        console.error(`Attempt ${i + 1} failed:`, error.message);
        if (i === maxRetries - 1) return null;
        await delay(delayMs);
      }
    }
  }
  return null;
}

async function getTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
  const prices = new Map<string, TokenPrice>();
  
  if (mints.length === 0) return prices;
  
  try {
    const uniqueMints = Array.from(new Set(mints)).slice(0, 50);
    const mintList = uniqueMints.join(",");
    
    const response = await fetch(`${JUPITER_PRICE_API}?ids=${mintList}`);
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        for (const [mint, info] of Object.entries(data.data) as [string, any][]) {
          if (info?.price) {
            prices.set(mint, {
              price: info.price,
              priceInSOL: info.price / (data.data["So11111111111111111111111111111111111111112"]?.price || 150),
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Jupiter price fetch failed:", error);
  }
  
  return prices;
}

async function getCurrentTokenHoldings(walletAddress: string): Promise<Map<string, number>> {
  const holdings = new Map<string, number>();
  
  try {
    const pubkey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });
    
    for (const account of tokenAccounts.value) {
      const parsed = account.account.data.parsed;
      if (parsed?.info?.mint && parsed?.info?.tokenAmount?.uiAmount) {
        holdings.set(parsed.info.mint, parsed.info.tokenAmount.uiAmount);
      }
    }
  } catch (error) {
    console.error("Failed to get token holdings:", error);
  }
  
  return holdings;
}

async function getAllSignatures(walletAddress: string, limit: number = 1000): Promise<ConfirmedSignatureInfo[]> {
  const pubkey = new PublicKey(walletAddress);
  const allSignatures: ConfirmedSignatureInfo[] = [];
  let lastSignature: string | undefined;
  
  while (allSignatures.length < limit) {
    const batchSize = Math.min(1000, limit - allSignatures.length);
    const options: any = { limit: batchSize };
    if (lastSignature) {
      options.before = lastSignature;
    }
    
    const signatures = await fetchWithRetry(() => 
      connection.getSignaturesForAddress(pubkey, options)
    );
    
    if (!signatures || signatures.length === 0) break;
    
    allSignatures.push(...signatures);
    lastSignature = signatures[signatures.length - 1].signature;
    
    if (signatures.length < batchSize) break;
    
    await delay(200);
  }
  
  return allSignatures;
}

function detectRugPatterns(tx: ParsedTransactionWithMeta): { isRug: boolean; rugType: string } {
  if (!tx.meta || !tx.transaction) return { isRug: false, rugType: "" };
  
  const logs = tx.meta.logMessages || [];
  const logsStr = logs.join(" ").toLowerCase();
  
  if (logsStr.includes("burn") && logsStr.includes("lp")) {
    return { isRug: true, rugType: "LP_BURN" };
  }
  
  if (logsStr.includes("freeze") || logsStr.includes("frozen")) {
    return { isRug: true, rugType: "TOKEN_FREEZE" };
  }
  
  if (logsStr.includes("honeypot") || logsStr.includes("sell failed")) {
    return { isRug: true, rugType: "HONEYPOT" };
  }
  
  if (tx.meta.err && JSON.stringify(tx.meta.err).includes("InsufficientFunds")) {
    return { isRug: true, rugType: "DRAIN" };
  }
  
  return { isRug: false, rugType: "" };
}

function detectDEXSwap(tx: ParsedTransactionWithMeta): { isDEX: boolean; dexName: string } {
  if (!tx.transaction) return { isDEX: false, dexName: "" };
  
  const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toString());
  
  for (const programId of DEX_PROGRAM_IDS) {
    if (accountKeys.includes(programId)) {
      if (programId.includes("675kPX")) return { isDEX: true, dexName: "Raydium" };
      if (programId.includes("JUP6")) return { isDEX: true, dexName: "Jupiter" };
      if (programId.includes("whirL")) return { isDEX: true, dexName: "Orca" };
      if (programId.includes("6EF8")) return { isDEX: true, dexName: "Pump.fun" };
      return { isDEX: true, dexName: "Unknown DEX" };
    }
  }
  
  return { isDEX: false, dexName: "" };
}

export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysisResult> {
  try {
    const pubkey = new PublicKey(walletAddress);
    
    console.log(`Starting comprehensive analysis for ${walletAddress}`);
    
    const [balance, allSignatures, currentHoldings] = await Promise.all([
      connection.getBalance(pubkey),
      getAllSignatures(walletAddress, 500),
      getCurrentTokenHoldings(walletAddress),
    ]);

    const currentBalanceSOL = balance / LAMPORTS_PER_SOL;
    const totalTransactions = allSignatures.length;

    if (totalTransactions === 0) {
      return {
        dumScore: 0,
        solLost: 0,
        rugsHit: 0,
        topRug: "None",
        totalTransactions: 0,
        averageLossPerTrade: 0,
        status: "VIRGIN WALLET",
        isRealData: true,
        tokensAnalyzed: 0,
        transactionsScanned: 0,
      };
    }

    console.log(`Found ${totalTransactions} transactions, analyzing...`);

    const batchSize = 10;
    const transactions: (ParsedTransactionWithMeta | null)[] = [];
    
    for (let i = 0; i < Math.min(allSignatures.length, 200); i += batchSize) {
      const batch = allSignatures.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(sig => 
          fetchWithRetry(() => 
            connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            })
          )
        )
      );
      transactions.push(...batchResults);
      
      if (i + batchSize < Math.min(allSignatures.length, 200)) {
        await delay(300);
      }
    }

    let totalSolOut = 0;
    let totalSolIn = 0;
    const tokenInteractions = new Map<string, { out: number; in: number; costBasis: number }>();
    let rugCount = 0;
    let failedTransactions = 0;
    let unknownTokenCount = 0;
    let suspiciousSwaps = 0;
    let tokensMintedToWallet = 0;
    let dexSwapCount = 0;
    let pumpFunTrades = 0;
    let rugPatternDetected = 0;
    const rugTypes: string[] = [];
    const allMints = new Set<string>();

    for (const tx of transactions) {
      if (!tx || !tx.meta) continue;

      if (tx.meta.err !== null) {
        failedTransactions++;
      }

      const rugCheck = detectRugPatterns(tx);
      if (rugCheck.isRug) {
        rugPatternDetected++;
        rugTypes.push(rugCheck.rugType);
      }

      const dexCheck = detectDEXSwap(tx);
      if (dexCheck.isDEX) {
        dexSwapCount++;
        if (dexCheck.dexName === "Pump.fun") {
          pumpFunTrades++;
        }
      }

      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;
      
      const accountIndex = tx.transaction.message.accountKeys.findIndex(
        key => key.pubkey.toString() === walletAddress
      );

      if (accountIndex >= 0) {
        const balanceDiff = (postBalances[accountIndex] - preBalances[accountIndex]) / LAMPORTS_PER_SOL;
        if (balanceDiff < 0) {
          totalSolOut += Math.abs(balanceDiff);
        } else {
          totalSolIn += balanceDiff;
        }
      }

      if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
        for (const preToken of tx.meta.preTokenBalances) {
          if (preToken.owner !== walletAddress) continue;
          
          allMints.add(preToken.mint);
          
          const postToken = tx.meta.postTokenBalances.find(
            p => p.mint === preToken.mint && p.owner === walletAddress
          );
          
          const preBal = preToken.uiTokenAmount?.uiAmount || 0;
          const postBal = postToken?.uiTokenAmount?.uiAmount || 0;
          
          if (!KNOWN_TOKENS[preToken.mint]) {
            unknownTokenCount++;
          }
          
          if (preBal > postBal) {
            const existing = tokenInteractions.get(preToken.mint) || { out: 0, in: 0, costBasis: 0 };
            existing.out += (preBal - postBal);
            tokenInteractions.set(preToken.mint, existing);
          } else if (postBal > preBal) {
            const existing = tokenInteractions.get(preToken.mint) || { out: 0, in: 0, costBasis: 0 };
            existing.in += (postBal - preBal);
            tokenInteractions.set(preToken.mint, existing);
            
            if (preBal === 0 && postBal > 0) {
              tokensMintedToWallet++;
            }
          }
        }
        
        for (const postToken of tx.meta.postTokenBalances) {
          if (postToken.owner !== walletAddress) continue;
          allMints.add(postToken.mint);
          
          const preToken = tx.meta.preTokenBalances?.find(
            p => p.mint === postToken.mint && p.owner === walletAddress
          );
          
          if (!preToken && postToken.uiTokenAmount?.uiAmount && postToken.uiTokenAmount.uiAmount > 0) {
            suspiciousSwaps++;
          }
        }
      }
    }

    const tokenPrices = await getTokenPrices(Array.from(allMints));

    let unrealizedLossesSOL = 0;
    let worthlessTokenCount = 0;
    
    Array.from(currentHoldings.entries()).forEach(([mint, amount]) => {
      const price = tokenPrices.get(mint);
      if (!price || price.priceInSOL < 0.000001) {
        worthlessTokenCount++;
        unrealizedLossesSOL += 0.1;
      }
    });

    let topRugMint = "";
    let topRugLoss = 0;
    let quickBuyAndSellTokens = 0;
    let massiveLosses = 0;
    let tokenConcentration = 0;
    let totalTokenLoss = 0;

    Array.from(tokenInteractions.entries()).forEach(([mint, { out, in: inAmount }]) => {
      if (out > inAmount * 1.05 || (out > 0 && inAmount === 0)) {
        rugCount++;
        const loss = out - inAmount;
        totalTokenLoss += loss;
        if (loss > topRugLoss) {
          topRugLoss = loss;
          topRugMint = mint;
        }
        
        if (inAmount > 0 && (loss / inAmount) > 0.3) {
          massiveLosses++;
        }
      }
      
      if (inAmount > 0 && out > 0) {
        quickBuyAndSellTokens++;
      }
      
      if (out === 0 && inAmount > 100) {
        tokenConcentration++;
      }
    });

    const netSolLost = Math.max(0, totalSolOut - totalSolIn);
    const estimatedSolLost = Math.round(netSolLost * 10) / 10;
    
    const tokenActivityScore = Math.max(tokenInteractions.size, 1) * 400;
    const failedTxPenalty = failedTransactions * 250;
    const unknownTokenPenalty = unknownTokenCount * 200;
    const quickSwapPenalty = quickBuyAndSellTokens * 500;
    const suspiciousPenalty = suspiciousSwaps * 350;
    const memeTokenBonus = tokensMintedToWallet * 600;
    const topRugScore = Math.min(topRugLoss * 50, 10000);
    const massiveLossPenalty = massiveLosses * 1200;
    const concentrationPenalty = tokenConcentration * 700;
    const rugMultiplier = rugCount * 1000;
    const dexActivityScore = dexSwapCount * 100;
    const pumpFunPenalty = pumpFunTrades * 800;
    const rugPatternPenalty = rugPatternDetected * 2000;
    const worthlessHoldingsPenalty = worthlessTokenCount * 500;
    const unrealizedPenalty = Math.floor(unrealizedLossesSOL * 200);
    
    const dumScore = Math.floor(
      (estimatedSolLost * 200) +
      rugMultiplier +
      (totalTransactions * 20) +
      tokenActivityScore +
      failedTxPenalty +
      unknownTokenPenalty +
      quickSwapPenalty +
      suspiciousPenalty +
      memeTokenBonus +
      topRugScore +
      massiveLossPenalty +
      concentrationPenalty +
      dexActivityScore +
      pumpFunPenalty +
      rugPatternPenalty +
      worthlessHoldingsPenalty +
      unrealizedPenalty
    );

    const avgLoss = rugCount > 0 ? Math.round((estimatedSolLost / rugCount) * 100) / 100 : 0;

    let status: string;
    if (dumScore > 100000) status = "LEGENDARY BAGHOLDER";
    else if (dumScore > 50000) status = "PERMA-REKT";
    else if (dumScore > 25000) status = "SEVERELY REKT";
    else if (dumScore > 10000) status = "REKT";
    else if (dumScore > 5000) status = "MODERATELY REKT";
    else if (dumScore > 2000) status = "SLIGHTLY REKT";
    else if (dumScore > 500) status = "PAPER HANDS";
    else status = "CLEAN... FOR NOW";

    console.log(`Analysis complete: Score=${dumScore}, Rugs=${rugCount}, SOL Lost=${estimatedSolLost}`);

    return {
      dumScore,
      solLost: estimatedSolLost,
      rugsHit: rugCount,
      topRug: topRugMint ? getTokenName(topRugMint) : (rugTypes[0] || "None yet"),
      totalTransactions,
      averageLossPerTrade: avgLoss,
      status,
      isRealData: true,
      unrealizedLosses: unrealizedLossesSOL,
      tokensAnalyzed: tokenInteractions.size,
      transactionsScanned: transactions.filter(t => t !== null).length,
    };

  } catch (error: any) {
    console.error("Solana analysis error:", error.message);
    
    if (error.message?.includes("Invalid public key")) {
      throw new Error("Invalid Solana wallet address");
    }
    
    return generateFallbackStats(walletAddress);
  }
}

function generateFallbackStats(address: string): WalletAnalysisResult {
  const seed = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => {
    const x = Math.sin(seed) * 10000;
    return min + ((x - Math.floor(x)) * (max - min));
  };

  const solLost = Math.floor(random(1, 500) * 10) / 10;
  const rugsHit = Math.floor(random(1, 50));
  const dumScore = Math.floor(solLost * 200 + rugsHit * 1000);
  const rugNames = ["SafeMoon", "ElonSperm", "DogeMeme", "CatShit", "MoonLambo", "SafeShib", "Pump Token", "Rug Token"];
  const topRug = rugNames[Math.floor(random(0, rugNames.length))];

  return {
    dumScore,
    solLost,
    rugsHit,
    topRug,
    totalTransactions: Math.floor(random(10, 500)),
    averageLossPerTrade: Math.floor((solLost / rugsHit) * 100) / 100,
    status: dumScore > 50000 ? "PERMA-REKT" : dumScore > 25000 ? "SEVERELY REKT" : dumScore > 10000 ? "REKT" : "SLIGHTLY REKT",
    isRealData: false,
  };
}

export async function isValidSolanaAddress(address: string): Promise<boolean> {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
