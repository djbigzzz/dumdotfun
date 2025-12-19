/**
 * Jupiter API integration for SOL price quotes
 * Uses Jupiter's free public API with CoinGecko fallback
 */

const JUPITER_PRICE_API = "https://api.jup.ag/price/v2";
const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";

// Common token addresses
export const TOKEN_ADDRESSES = {
  SOL: "So11111111111111111111111111111111111111112", // Wrapped SOL
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

// Cache for SOL price to reduce API calls
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

interface JupiterPriceResponse {
  data: {
    [tokenId: string]: {
      id: string;
      mintSymbol: string;
      vsToken: string;
      vsTokenSymbol: string;
      price: number;
    };
  };
  timeTaken: number;
}

/**
 * Get SOL price in USD from CoinGecko (fallback)
 */
async function getSolPriceFromCoinGecko(): Promise<number | null> {
  try {
    const response = await fetch(
      `${COINGECKO_API}?ids=solana&vs_currencies=usd`
    );

    if (!response.ok) {
      console.error("CoinGecko API returned:", response.status);
      return null;
    }

    const data = await response.json();
    return data.solana?.usd || null;
  } catch (error) {
    console.error("Error fetching SOL price from CoinGecko:", error);
    return null;
  }
}

/**
 * Get SOL price in USD with caching and fallback
 */
export async function getSolPrice(): Promise<number | null> {
  // Return cached price if still valid
  if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < CACHE_TTL) {
    return cachedSolPrice.price;
  }

  // Try Jupiter API first
  try {
    const response = await fetch(
      `${JUPITER_PRICE_API}?ids=${TOKEN_ADDRESSES.SOL}`
    );

    if (response.ok) {
      const data: JupiterPriceResponse = await response.json();
      const solData = data.data[TOKEN_ADDRESSES.SOL];

      if (solData?.price) {
        cachedSolPrice = { price: solData.price, timestamp: Date.now() };
        return solData.price;
      }
    }
  } catch (error) {
    console.error("Jupiter API failed, trying CoinGecko:", error);
  }

  // Fallback to CoinGecko
  const coinGeckoPrice = await getSolPriceFromCoinGecko();
  if (coinGeckoPrice) {
    cachedSolPrice = { price: coinGeckoPrice, timestamp: Date.now() };
    return coinGeckoPrice;
  }

  // Return last cached price if all APIs fail
  if (cachedSolPrice) {
    console.warn("All price APIs failed, returning stale cached price");
    return cachedSolPrice.price;
  }

  console.error("All price sources failed");
  return null;
}

/**
 * Get token price in SOL
 * @param tokenMint The token's mint address
 */
export async function getTokenPriceInSol(tokenMint: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${JUPITER_PRICE_API}?ids=${tokenMint}&vsToken=${TOKEN_ADDRESSES.SOL}`
    );

    if (!response.ok) {
      console.error("Jupiter API returned:", response.status);
      return null;
    }

    const data: JupiterPriceResponse = await response.json();
    const tokenData = data.data[tokenMint];

    if (!tokenData) {
      // Token not found on Jupiter (might be too new)
      return null;
    }

    return tokenData.price;
  } catch (error) {
    console.error("Error fetching token price from Jupiter:", error);
    return null;
  }
}

/**
 * Get multiple token prices at once
 * @param tokenMints Array of token mint addresses
 */
export async function getMultipleTokenPrices(
  tokenMints: string[]
): Promise<Record<string, number | null>> {
  try {
    const ids = tokenMints.join(",");
    const response = await fetch(
      `${JUPITER_PRICE_API}?ids=${ids}&vsToken=${TOKEN_ADDRESSES.USDC}`
    );

    if (!response.ok) {
      console.error("Jupiter API returned:", response.status);
      return {};
    }

    const data: JupiterPriceResponse = await response.json();
    
    const prices: Record<string, number | null> = {};
    for (const mint of tokenMints) {
      const tokenData = data.data[mint];
      prices[mint] = tokenData ? tokenData.price : null;
    }

    return prices;
  } catch (error) {
    console.error("Error fetching multiple token prices from Jupiter:", error);
    return {};
  }
}

/**
 * Convert SOL amount to USD
 */
export async function solToUsd(solAmount: number): Promise<number | null> {
  const solPrice = await getSolPrice();
  if (!solPrice) return null;
  return solAmount * solPrice;
}

/**
 * Convert USD amount to SOL
 */
export async function usdToSol(usdAmount: number): Promise<number | null> {
  const solPrice = await getSolPrice();
  if (!solPrice) return null;
  return usdAmount / solPrice;
}
