// Dexscreener API - Free, no auth required
// Docs: https://docs.dexscreener.com/api/reference

interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5?: {
      buys: number;
      sells: number;
    };
    h1?: {
      buys: number;
      sells: number;
    };
    h24?: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    h24?: number;
    h6?: number;
    h1?: number;
    m5?: number;
  };
  priceChange: {
    m5?: number;
    h1?: number;
    h24?: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: Array<{ url: string; label: string }>;
    socials?: Array<{ type: string; url: string }>;
  };
}

interface DexscreenerResponse {
  pairs: DexscreenerPair[] | null;
}

interface Token {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  source: string;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function getTokensFromDexscreener(): Promise<Token[]> {
  try {
    // Get boosted/trending tokens from Dexscreener
    const response = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", {
      headers: { "User-Agent": "Dum.fun" }
    });

    if (!response.ok) {
      throw new Error(`Dexscreener API returned ${response.status}`);
    }

    const data: DexscreenerResponse[] = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const tokens: Token[] = [];

    // Process up to 20 tokens
    for (const item of data.slice(0, 20)) {
      if (!item.pairs || item.pairs.length === 0) continue;

      const pair = item.pairs[0]; // Get first pair for this token

      // Only include Solana pairs
      if (pair.chainId !== "solana") continue;

      // Skip if it's a wrapper or stablecoin
      if (pair.baseToken.symbol.includes("USD") || pair.baseToken.symbol.includes("USDC")) {
        continue;
      }

      // Calculate market cap in SOL
      const marketCapUsd = pair.marketCap || pair.fdv || 0;
      const priceUsd = parseFloat(pair.priceUsd || "0");
      const marketCapSol = priceUsd > 0 ? marketCapUsd / priceUsd : 0;

      // Get price in SOL (if quote is SOL)
      let priceInSol = 0;
      if (pair.quoteToken.address === SOL_MINT) {
        priceInSol = parseFloat(pair.priceNative || "0");
      } else {
        // Convert USD price to SOL (approximate - will need SOL price for exact conversion)
        // For now, use a rough estimate (assuming 1 SOL ≈ $120)
        priceInSol = priceUsd / 120;
      }

      // Estimate bonding curve progress (0-100%)
      // Since Dexscreener doesn't have this, we'll estimate based on liquidity
      let bondingCurveProgress = 0;
      if (pair.liquidity?.usd) {
        // Rough estimate: 85 SOL (~$10k) = graduation threshold on Pump.fun
        // Scale to 100% at that point
        bondingCurveProgress = Math.min((marketCapSol / 85) * 100, 100);
      }

      tokens.push({
        mint: pair.baseToken.address,
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        imageUri: pair.info?.imageUrl || null,
        bondingCurveProgress: Math.round(bondingCurveProgress * 10) / 10,
        marketCapSol: Math.round(marketCapSol * 100) / 100,
        priceInSol: priceInSol,
        creatorAddress: "dexscreener", // Placeholder - Dexscreener doesn't expose creator
        createdAt: pair.pairCreatedAt 
          ? new Date(pair.pairCreatedAt).toISOString()
          : new Date().toISOString(),
        isGraduated: false,
        source: "dexscreener"
      });
    }

    return tokens;
  } catch (error) {
    console.error("Error fetching tokens from Dexscreener:", error);
    return [];
  }
}
