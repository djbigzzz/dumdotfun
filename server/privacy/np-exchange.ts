import { PublicKey, Connection } from "@solana/web3.js";

export const NP_EXCHANGE_CONFIG = {
  name: "NP Exchange (PNP)",
  version: "0.2.4",
  description: "Private & Agent-Based Prediction Markets using bonding curves on Solana devnet",
  bounty: "$2,500",
  category: "Prediction Markets",
  status: "active" as const,
  programId: "pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz",
  collateralMint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
  features: [
    "Permissionless market creation",
    "Bonding curve pricing (no orderbook)",
    "AI agent integration for market creation",
    "Privacy-focused token collateral",
    "Instant liquidity without market makers",
    "V2 AMM and V3 P2P market types"
  ],
  docs: "https://gist.github.com/proxima424/748c145d4603dcfa6e08a2abc69ae89c"
};

const DEVNET_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

let pnpClient: any = null;

async function getPNPClient() {
  if (!pnpClient) {
    try {
      const { PNPClient } = await import("pnp-sdk");
      pnpClient = new PNPClient(DEVNET_RPC);
      console.log("[PNP] Initialized PNP client on devnet");
      console.log("[PNP] Program ID:", NP_EXCHANGE_CONFIG.programId);
    } catch (error) {
      console.error("[PNP] Failed to initialize PNP client:", error);
      return null;
    }
  }
  return pnpClient;
}

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
  programId: string;
  network: string;
}> {
  const client = await getPNPClient();
  return {
    active: client !== null,
    name: NP_EXCHANGE_CONFIG.name,
    bounty: NP_EXCHANGE_CONFIG.bounty,
    description: NP_EXCHANGE_CONFIG.description,
    programId: NP_EXCHANGE_CONFIG.programId,
    network: "devnet"
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
  marketParams?: any;
  instructions?: string[];
}> {
  const client = await getPNPClient();
  
  const topics: Record<string, { question: string; days: number }> = {
    crypto: { question: `Will the crypto market cap exceed $5T by end of Q1?`, days: 90 },
    token: { question: `Will this token graduate to DEX within 7 days?`, days: 7 },
    meme: { question: `Will this meme token 10x from launch price?`, days: 30 },
    btc: { question: `Will BTC reach $150K by end of 2026?`, days: 365 },
    sol: { question: `Will SOL reach $500 by end of 2026?`, days: 365 },
    default: { question: params.topic, days: 7 }
  };

  const topicKey = Object.keys(topics).find(k => 
    params.topic.toLowerCase().includes(k) || params.context.toLowerCase().includes(k)
  ) || "default";

  const template = topics[topicKey];
  const resolutionDate = new Date();
  resolutionDate.setDate(resolutionDate.getDate() + template.days);
  
  const endTime = BigInt(Math.floor(resolutionDate.getTime() / 1000));

  return {
    success: true,
    question: template.question,
    suggestedResolutionDate: resolutionDate,
    marketParams: {
      question: template.question,
      initialLiquidity: BigInt(1_000_000).toString(),
      endTime: endTime.toString(),
      baseMint: NP_EXCHANGE_CONFIG.collateralMint,
      creatorAddress: params.creatorAddress
    },
    instructions: [
      "1. Create market with client.market.createMarket()",
      "2. Call client.setMarketResolvable(market, true) to enable trading",
      "3. Trade with client.trading.buyTokensUsdc()",
      "4. Redeem with client.redemption.redeemPosition()"
    ]
  };
}

export async function prepareMarketCreation(params: {
  question: string;
  initialLiquidityUsdc: number;
  daysUntilEnd: number;
  creatorAddress: string;
}): Promise<{
  success: boolean;
  message: string;
  marketParams?: any;
  requiresWalletSignature: boolean;
}> {
  try {
    const client = await getPNPClient();
    if (!client) {
      return {
        success: false,
        message: "PNP SDK not available",
        requiresWalletSignature: false
      };
    }

    const endTime = BigInt(Math.floor(Date.now() / 1000) + params.daysUntilEnd * 24 * 60 * 60);
    const initialLiquidity = BigInt(params.initialLiquidityUsdc * 1_000_000);

    return {
      success: true,
      message: `Ready to create market: "${params.question}". Sign transaction to complete.`,
      marketParams: {
        question: params.question,
        initialLiquidity: initialLiquidity.toString(),
        endTime: endTime.toString(),
        baseMint: NP_EXCHANGE_CONFIG.collateralMint,
        programId: NP_EXCHANGE_CONFIG.programId
      },
      requiresWalletSignature: true
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      requiresWalletSignature: false
    };
  }
}

export async function prepareTrade(params: PNPBetParams): Promise<{
  success: boolean;
  message: string;
  tradeParams?: any;
  requiresWalletSignature: boolean;
}> {
  try {
    const client = await getPNPClient();
    if (!client) {
      return {
        success: false,
        message: "PNP SDK not available",
        requiresWalletSignature: false
      };
    }

    return {
      success: true,
      message: `Ready to buy ${params.amount} USDC of ${params.side.toUpperCase()} tokens. Sign transaction to complete.`,
      tradeParams: {
        market: params.marketId,
        buyYesToken: params.side === "yes",
        amountUsdc: params.amount
      },
      requiresWalletSignature: true
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      requiresWalletSignature: false
    };
  }
}

export function getNPExchangeIntegration() {
  return {
    id: "np-exchange",
    ...NP_EXCHANGE_CONFIG,
    endpoints: {
      status: "/api/privacy/pnp/status",
      aiMarket: "/api/privacy/pnp/ai-market",
      createMarket: "/api/privacy/pnp/create-market",
      trade: "/api/privacy/pnp/trade"
    }
  };
}
