/**
 * Jupiter Integration Status
 *
 * Jupiter is dum.fun's pricing oracle: every USD value displayed in the
 * product (token market caps, wallet portfolio totals, prediction-market
 * payouts) is derived from Jupiter's price API with a CoinGecko fallback.
 *
 * Track: Jupiter — Colosseum Frontier 2026 ($3K)
 */

export const JUPITER_CONFIG = {
  priceApi: "https://api.jup.ag/price/v2",
  swapApi: "https://quote-api.jup.ag/v6",
  features: [
    "SOL/USD price oracle for every USD value in the product",
    "Token-in-SOL pricing for graduated tokens (post-bonding-curve)",
    "Bulk price fetch for portfolio aggregation",
    "30s cache + CoinGecko fallback for resilience",
  ],
  track: "Jupiter — Colosseum Frontier 2026",
};

export function getJupiterStatus() {
  return {
    integrated: true,
    priceApi: JUPITER_CONFIG.priceApi,
    swapApi: JUPITER_CONFIG.swapApi,
    features: JUPITER_CONFIG.features,
    useCases: [
      {
        name: "USD Pricing Across the Product",
        description:
          "Every USD value shown — market caps on /tokens, portfolio totals " +
          "on /wallet, prediction-market payouts on /market — is computed " +
          "from a Jupiter price quote.",
        status: "live",
      },
      {
        name: "Graduated-Token Routing",
        description:
          "Once a token graduates from the bonding curve to Raydium, the " +
          "swap panel hands routing off to Jupiter for best-execution swaps.",
        status: "integration-ready",
      },
    ],
    docs: "https://docs.jup.ag",
    hackathonTrack: JUPITER_CONFIG.track,
  };
}
