export const NP_EXCHANGE_CONFIG = {
  name: "NP Exchange (PNP)",
  version: "1.0.0",
  description: "Private & Agent-Based Prediction Markets using bonding curves",
  bounty: "$2,500",
  category: "Prediction Markets",
  status: "active" as const,
  features: [
    "Permissionless market creation",
    "Bonding curve pricing (no orderbook)",
    "AI agent integration for market creation",
    "Privacy-focused token collateral",
    "Instant liquidity without market makers"
  ],
  docs: "https://docs.pnp.exchange/pnp-sdk"
};

export interface PNPMarketParams {
  question: string;
  description: string;
  resolutionDate: Date;
  creatorAddress: string;
  initialLiquidity: number;
}

export interface PNPBetParams {
  marketId: string;
  side: "yes" | "no";
  amount: number;
  walletAddress: string;
}

export async function getNPExchangeStatus(): Promise<{
  active: boolean;
  name: string;
  bounty: string;
  description: string;
}> {
  return {
    active: true,
    name: NP_EXCHANGE_CONFIG.name,
    bounty: NP_EXCHANGE_CONFIG.bounty,
    description: NP_EXCHANGE_CONFIG.description
  };
}

export async function createAIAgentMarket(params: {
  topic: string;
  context: string;
  creatorAddress: string;
}): Promise<{
  success: boolean;
  question: string;
  suggestedResolutionDate: Date;
  marketId?: string;
}> {
  const topics: Record<string, { question: string; days: number }> = {
    crypto: { question: `Will the crypto market cap exceed $5T by end of Q1?`, days: 90 },
    token: { question: `Will this token graduate to DEX within 7 days?`, days: 7 },
    meme: { question: `Will this meme token 10x from launch price?`, days: 30 },
    default: { question: `Will this prediction come true?`, days: 30 }
  };

  const topicKey = Object.keys(topics).find(k => 
    params.topic.toLowerCase().includes(k) || params.context.toLowerCase().includes(k)
  ) || "default";

  const template = topics[topicKey];
  const resolutionDate = new Date();
  resolutionDate.setDate(resolutionDate.getDate() + template.days);

  return {
    success: true,
    question: template.question,
    suggestedResolutionDate: resolutionDate,
    marketId: `ai-${Date.now()}`
  };
}

export function getNPExchangeIntegration() {
  return {
    id: "np-exchange",
    ...NP_EXCHANGE_CONFIG,
    endpoints: {
      createMarket: "/api/privacy/pnp/create-market",
      aiMarket: "/api/privacy/pnp/ai-market",
      bet: "/api/privacy/pnp/bet"
    }
  };
}
