import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransactionWithMeta } from "@solana/web3.js";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const connection = new Connection(SOLANA_RPC, "confirmed");

interface TokenTransfer {
  mint: string;
  amount: number;
  direction: "in" | "out";
}

interface WalletAnalysisResult {
  dumScore: number;
  solLost: number;
  rugsHit: number;
  topRug: string;
  totalTransactions: number;
  averageLossPerTrade: number;
  status: string;
  isRealData: boolean;
}

const RUG_TOKEN_NAMES: Record<string, string> = {
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": "POPCAT",
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "WIF",
  "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN": "MYRO",
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": "PYTH",
};

function getTokenName(mint: string): string {
  return RUG_TOKEN_NAMES[mint] || `${mint.slice(0, 6)}...${mint.slice(-4)}`;
}

export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysisResult> {
  try {
    const pubkey = new PublicKey(walletAddress);
    
    const [balance, signatures] = await Promise.all([
      connection.getBalance(pubkey),
      connection.getSignaturesForAddress(pubkey, { limit: 100 }),
    ]);

    const currentBalanceSOL = balance / LAMPORTS_PER_SOL;
    const totalTransactions = signatures.length;

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
      };
    }

    const recentSignatures = signatures.slice(0, 100);
    const transactions = await Promise.all(
      recentSignatures.map(sig => 
        connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        }).catch(() => null)
      )
    );

    let totalSolOut = 0;
    let totalSolIn = 0;
    const tokenInteractions = new Map<string, { out: number; in: number }>();
    let rugCount = 0;
    let failedTransactions = 0;
    let unknownTokenCount = 0;
    let suspiciousSwaps = 0;
    let tokensMintedToWallet = 0;

    for (const tx of transactions) {
      if (!tx || !tx.meta) continue;

      // Count failed transactions
      if (tx.meta.err !== null) {
        failedTransactions++;
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
          
          const postToken = tx.meta.postTokenBalances.find(
            p => p.mint === preToken.mint && p.owner === walletAddress
          );
          
          const preBal = preToken.uiTokenAmount?.uiAmount || 0;
          const postBal = postToken?.uiTokenAmount?.uiAmount || 0;
          
          // Check if token is unknown (not in known list)
          if (!RUG_TOKEN_NAMES[preToken.mint]) {
            unknownTokenCount++;
          }
          
          if (preBal > postBal) {
            const existing = tokenInteractions.get(preToken.mint) || { out: 0, in: 0 };
            existing.out += (preBal - postBal);
            tokenInteractions.set(preToken.mint, existing);
          } else if (postBal > preBal) {
            const existing = tokenInteractions.get(preToken.mint) || { out: 0, in: 0 };
            existing.in += (postBal - preBal);
            tokenInteractions.set(preToken.mint, existing);
            
            // If receiving token from 0, could be airdrop or mint
            if (preBal === 0 && postBal > 0) {
              tokensMintedToWallet++;
            }
          }
        }
      }

      // Detect post-transaction token balance changes (suspicious if sudden)
      if (tx.meta.postTokenBalances) {
        for (const postToken of tx.meta.postTokenBalances) {
          if (postToken.owner !== walletAddress) continue;
          
          const preToken = tx.meta.preTokenBalances?.find(
            p => p.mint === postToken.mint && p.owner === walletAddress
          );
          
          if (!preToken && postToken.uiTokenAmount?.uiAmount && postToken.uiTokenAmount.uiAmount > 0) {
            // Receiving token that didn't exist before = suspicious
            suspiciousSwaps++;
          }
        }
      }
    }

    let topRugMint = "";
    let topRugLoss = 0;
    let quickBuyAndSellTokens = 0;
    let massiveLosses = 0;
    let tokenConcentration = 0;

    // Track any token that was sold (more aggressive rug detection)
    Array.from(tokenInteractions.entries()).forEach(([mint, { out, in: inAmount }]) => {
      // Count as a rug if: sold more than bought (1.1x ratio), or any significant sell
      if (out > inAmount * 1.1 || (out > 0 && inAmount === 0)) {
        rugCount++;
        const loss = out - inAmount;
        if (loss > topRugLoss) {
          topRugLoss = loss;
          topRugMint = mint;
        }
        
        // Detect massive losses (lost 50%+ on a single token)
        if (inAmount > 0 && (loss / inAmount) > 0.5) {
          massiveLosses++;
        }
      }
      
      // Detect quick buy-and-sell pattern (both in and out on same token)
      if (inAmount > 0 && out > 0 && inAmount > 10 && out > 10) {
        quickBuyAndSellTokens++;
      }
      
      // Detect token concentration (holding way more of one than bought)
      if (out === 0 && inAmount > 1000) {
        tokenConcentration++;
      }
    });

    const netSolLost = Math.max(0, totalSolOut - totalSolIn);
    const estimatedSolLost = Math.round(netSolLost * 10) / 10;
    
    // Calculate comprehensive dum score with multiple factors
    const tokenActivityScore = Math.max(tokenInteractions.size, 1) * 300; // 300 points per unique token
    const failedTxPenalty = failedTransactions * 200; // Failed txs are BIG sus
    const unknownTokenPenalty = unknownTokenCount * 150; // Unknown tokens = degen
    const quickSwapPenalty = quickBuyAndSellTokens * 400; // Quick swaps = bad timing
    const suspiciousPenalty = suspiciousSwaps * 300; // Sudden token appearances
    const memeTokenBonus = tokensMintedToWallet * 500; // Got minted tokens = got trash
    const topRugScore = Math.max(topRugLoss * 1000, 0); // BIG penalty for worst loss
    const massiveLossPenalty = massiveLosses * 1000; // 50%+ losses on tokens = disaster
    const concentrationPenalty = tokenConcentration * 600; // Holding tons of shitcoins
    const rugMultiplier = Math.max(rugCount * 800, 0); // MUCH higher rug multiplier
    
    const dumScore = Math.floor(
      (estimatedSolLost * 150) +  // Increased from 100
      rugMultiplier +  // Increased from 500 per rug
      (totalTransactions * 15) +  // Increased from 10
      tokenActivityScore +
      failedTxPenalty +
      unknownTokenPenalty +
      quickSwapPenalty +
      suspiciousPenalty +
      memeTokenBonus +
      topRugScore +
      massiveLossPenalty +
      concentrationPenalty
    );

    const avgLoss = rugCount > 0 ? Math.round((estimatedSolLost / rugCount) * 100) / 100 : 0;

    let status: string;
    if (dumScore > 50000) status = "PERMA-REKT";
    else if (dumScore > 25000) status = "SEVERELY REKT";
    else if (dumScore > 10000) status = "REKT";
    else if (dumScore > 5000) status = "MODERATELY REKT";
    else if (dumScore > 1000) status = "SLIGHTLY REKT";
    else if (dumScore > 100) status = "PAPER HANDS";
    else status = "CLEAN... FOR NOW";

    return {
      dumScore,
      solLost: estimatedSolLost,
      rugsHit: rugCount,
      topRug: topRugMint ? getTokenName(topRugMint) : "None yet",
      totalTransactions,
      averageLossPerTrade: avgLoss,
      status,
      isRealData: true,
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
  const dumScore = Math.floor(solLost * 100 + rugsHit * 500);
  const rugNames = ["SafeMoon", "ElonSperm", "DogeMeme", "CatShit", "MoonLambo", "SafeShib"];
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
