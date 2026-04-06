import axios from "axios";

// Production endpoint (requires API key from hello@dflow.net)
const DFLOW_API_PROD = "https://prediction-markets-api.dflow.net/api/v1";
// Dev endpoint — publicly accessible, no API key required
const DFLOW_API_DEV = "https://dev-prediction-markets-api.dflow.net/api/v1";

const DFLOW_TRADE_API = "https://dev-quote-api.dflow.net";

export interface DFlowMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  eventTicker: string;
  status: string;
  marketType: string;
  openTime: number;
  closeTime: number;
  expirationTime: number;
  volume: number;
  openInterest: number;
  yesAsk?: string;
  yesBid?: string;
  noAsk?: string;
  noBid?: string;
  result?: string;
  rulesPrimary?: string;
  rulesSecondary?: string;
  yesSubTitle?: string;
  noSubTitle?: string;
  canCloseEarly: boolean;
  earlyCloseCondition?: string;
  accounts?: Record<string, string>;
}

export interface DFlowEvent {
  ticker: string;
  seriesTicker: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  competition?: string;
  competitionScope?: string;
  liquidity: number;
  volume: number;
  volume24h: number;
  openInterest: number;
  strikeDate?: number;
  strikePeriod?: string;
  markets: DFlowMarket[];
  settlementSources?: Array<{ name: string; url: string }>;
}

export interface DFlowOrderbookEntry {
  price: string;
  quantity: string;
}

export interface DFlowOrderbook {
  yes: {
    bids: DFlowOrderbookEntry[];
    asks: DFlowOrderbookEntry[];
  };
  no: {
    bids: DFlowOrderbookEntry[];
    asks: DFlowOrderbookEntry[];
  };
}

export interface DFlowTrade {
  id: string;
  ticker: string;
  side: "yes" | "no";
  action: "buy" | "sell";
  price: string;
  count: number;
  timestamp: number;
}

export interface DFlowQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: unknown[];
}

function getApiKey(): string | null {
  return process.env.DFLOW_API_KEY || null;
}

function getApiBase(): string {
  return getApiKey() ? DFLOW_API_PROD : DFLOW_API_DEV;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return headers;
}

// Always configured — dev endpoint works without an API key
export function isDFlowConfigured(): boolean {
  return true;
}

export function hasDFlowApiKey(): boolean {
  return !!getApiKey();
}

export function getDFlowStatus() {
  const hasKey = hasDFlowApiKey();
  return {
    configured: true,
    hasApiKey: hasKey,
    endpoint: hasKey ? "production" : "dev (public)",
    metadataApi: getApiBase(),
    tradeApi: DFLOW_TRADE_API,
    features: [
      "Tokenized Prediction Markets (Kalshi on Solana)",
      "SPL Token Trading",
      "MEV-Protected Swaps",
      "Real-time Orderbook Data",
      "Market Search",
    ],
  };
}

export async function fetchEvents(options: {
  limit?: number;
  cursor?: number;
  status?: string;
  sort?: "volume" | "volume24h" | "liquidity" | "openInterest" | "startDate";
  withNestedMarkets?: boolean;
  seriesTickers?: string[];
}): Promise<{ events: DFlowEvent[]; cursor: number | null }> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.cursor) params.set("cursor", options.cursor.toString());
  if (options.status) params.set("status", options.status);
  if (options.sort) params.set("sort", options.sort);
  if (options.withNestedMarkets !== undefined) {
    params.set("withNestedMarkets", options.withNestedMarkets.toString());
  }
  if (options.seriesTickers?.length) {
    params.set("seriesTickers", options.seriesTickers.join(","));
  }

  try {
    const response = await axios.get(`${getApiBase()}/events?${params.toString()}`, {
      headers: getHeaders(),
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error("DFlow API error (events):", error.response?.data || error.message);
    throw new Error(`Failed to fetch events: ${error.message}`);
  }
}

export async function fetchMarkets(options: {
  limit?: number;
  cursor?: number;
  status?: string;
  sort?: "volume" | "volume24h" | "liquidity" | "openInterest";
}): Promise<{ markets: DFlowMarket[]; cursor: number | null }> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.cursor) params.set("cursor", options.cursor.toString());
  if (options.status) params.set("status", options.status);
  if (options.sort) params.set("sort", options.sort);

  try {
    const response = await axios.get(`${getApiBase()}/markets?${params.toString()}`, {
      headers: getHeaders(),
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error("DFlow API error (markets):", error.response?.data || error.message);
    throw new Error(`Failed to fetch markets: ${error.message}`);
  }
}

export async function fetchMarketByTicker(ticker: string): Promise<DFlowMarket | null> {
  try {
    const response = await axios.get(`${getApiBase()}/markets/${encodeURIComponent(ticker)}`, {
      headers: getHeaders(),
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    console.error("DFlow API error (market):", error.response?.data || error.message);
    throw new Error(`Failed to fetch market: ${error.message}`);
  }
}

export async function fetchOrderbook(ticker: string): Promise<DFlowOrderbook | null> {
  try {
    const response = await axios.get(
      `${getApiBase()}/orderbook/${encodeURIComponent(ticker)}`,
      { headers: getHeaders(), timeout: 10000 }
    );
    return response.data;
  } catch (error: any) {
    console.error("DFlow API error (orderbook):", error.response?.data || error.message);
    return null;
  }
}

export async function fetchTrades(
  ticker: string,
  options?: { limit?: number; cursor?: number }
): Promise<{ trades: DFlowTrade[]; cursor: number | null }> {
  const params = new URLSearchParams();
  params.set("ticker", ticker);
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.cursor) params.set("cursor", options.cursor.toString());

  try {
    const response = await axios.get(`${getApiBase()}/trades?${params.toString()}`, {
      headers: getHeaders(),
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error("DFlow API error (trades):", error.response?.data || error.message);
    return { trades: [], cursor: null };
  }
}

export async function searchEvents(query: string): Promise<DFlowEvent[]> {
  try {
    const response = await axios.get(
      `${getApiBase()}/search?q=${encodeURIComponent(query)}&withNestedMarkets=true`,
      { headers: getHeaders(), timeout: 10000 }
    );
    return response.data.events || [];
  } catch (error: any) {
    console.error("DFlow API error (search):", error.response?.data || error.message);
    return [];
  }
}

export async function getSwapQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  userPublicKey: string;
  slippageBps?: number;
}): Promise<DFlowQuote | null> {
  try {
    const qs = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount.toString(),
      userPublicKey: params.userPublicKey,
      slippageBps: (params.slippageBps ?? 50).toString(),
    });
    const response = await axios.get(`${DFLOW_TRADE_API}/intent?${qs.toString()}`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error("DFlow quote error:", error.response?.data || error.message);
    return null;
  }
}

export function formatMarketForDisplay(market: DFlowMarket) {
  const yesPrice = market.yesAsk ? parseFloat(market.yesAsk) : null;
  const noPrice = market.noAsk ? parseFloat(market.noAsk) : null;

  return {
    ticker: market.ticker,
    title: market.title,
    subtitle: market.subtitle,
    eventTicker: market.eventTicker,
    status: market.status,
    yesPrice: yesPrice ? Math.round(yesPrice * 100) : null,
    noPrice: noPrice ? Math.round(noPrice * 100) : null,
    volume: market.volume,
    openInterest: market.openInterest,
    closeTime: market.closeTime,
    expirationTime: market.expirationTime,
    rules: market.rulesPrimary,
    yesLabel: market.yesSubTitle || "Yes",
    noLabel: market.noSubTitle || "No",
  };
}

export function formatEventForDisplay(event: DFlowEvent) {
  return {
    ticker: event.ticker,
    seriesTicker: event.seriesTicker,
    title: event.title,
    subtitle: event.subtitle,
    imageUrl: event.imageUrl,
    volume: event.volume,
    volume24h: event.volume24h,
    liquidity: event.liquidity,
    openInterest: event.openInterest,
    strikeDate: event.strikeDate,
    strikePeriod: event.strikePeriod,
    markets: event.markets.map(formatMarketForDisplay),
    settlementSources: event.settlementSources,
  };
}
