/**
 * Jupiter API integration for SOL price quotes
 * Uses Jupiter's free public API
 */

const JUPITER_PRICE_API = "https://price.jup.ag/v6/price";

// Common token addresses
export const TOKEN_ADDRESSES = {
  SOL: "So11111111111111111111111111111111111111112", // Wrapped SOL
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
};

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
 * Get SOL price in USD
 */
export async function getSolPrice(): Promise<number | null> {
  try {
    const response = await fetch(
      `${JUPITER_PRICE_API}?ids=${TOKEN_ADDRESSES.SOL}&vsToken=${TOKEN_ADDRESSES.USDC}`
    );

    if (!response.ok) {
      console.error("Jupiter API returned:", response.status);
      return null;
    }

    const data: JupiterPriceResponse = await response.json();
    const solData = data.data[TOKEN_ADDRESSES.SOL];

    if (!solData) {
      console.error("No SOL data in Jupiter response");
      return null;
    }

    return solData.price;
  } catch (error) {
    console.error("Error fetching SOL price from Jupiter:", error);
    return null;
  }
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
