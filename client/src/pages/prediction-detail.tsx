import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, DollarSign, TrendingUp, AlertCircle, ExternalLink } from "lucide-react";
import { Layout } from "@/components/layout";

interface DFlowMarket {
  ticker: string;
  title: string;
  subtitle?: string;
  eventTicker: string;
  status: string;
  yesPrice: number | null;
  noPrice: number | null;
  volume: number;
  openInterest: number;
  closeTime: number;
  expirationTime: number;
  rules?: string;
  yesLabel: string;
  noLabel: string;
}

interface DFlowEvent {
  ticker: string;
  seriesTicker: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  volume: number;
  volume24h: number;
  liquidity: number;
  openInterest: number;
  strikeDate?: number;
  markets: DFlowMarket[];
}

interface OrderbookEntry {
  price: string;
  quantity: string;
}

interface Orderbook {
  yes: { bids: OrderbookEntry[]; asks: OrderbookEntry[] };
  no: { bids: OrderbookEntry[]; asks: OrderbookEntry[] };
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MarketCard({ market }: { market: DFlowMarket }) {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");

  const { data: orderbook } = useQuery<Orderbook>({
    queryKey: ["/api/dflow/orderbook", market.ticker],
    queryFn: async () => {
      const res = await fetch(`/api/dflow/orderbook/${encodeURIComponent(market.ticker)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!market.ticker,
    refetchInterval: 5000,
  });

  const bestYesBid = orderbook?.yes?.bids?.[0];
  const bestYesAsk = orderbook?.yes?.asks?.[0];
  const bestNoBid = orderbook?.no?.bids?.[0];
  const bestNoAsk = orderbook?.no?.asks?.[0];

  return (
    <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-black text-gray-900">{market.title}</h2>
          {market.subtitle && (
            <p className="text-gray-500 text-sm mt-1">{market.subtitle}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-bold text-green-600">{market.yesLabel}</h3>
            <div className="bg-green-50 border-2 border-black rounded-lg p-4">
              <div className="text-3xl font-black text-green-600">
                {market.yesPrice !== null ? `${market.yesPrice}¢` : "-"}
              </div>
              {bestYesBid && bestYesAsk && (
                <div className="text-xs text-gray-500 mt-2">
                  <span className="text-green-600">Bid: {(parseFloat(bestYesBid.price) * 100).toFixed(1)}¢</span>
                  {" / "}
                  <span className="text-red-600">Ask: {(parseFloat(bestYesAsk.price) * 100).toFixed(1)}¢</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-red-600">{market.noLabel}</h3>
            <div className="bg-red-50 border-2 border-black rounded-lg p-4">
              <div className="text-3xl font-black text-red-600">
                {market.noPrice !== null ? `${market.noPrice}¢` : "-"}
              </div>
              {bestNoBid && bestNoAsk && (
                <div className="text-xs text-gray-500 mt-2">
                  <span className="text-green-600">Bid: {(parseFloat(bestNoBid.price) * 100).toFixed(1)}¢</span>
                  {" / "}
                  <span className="text-red-600">Ask: {(parseFloat(bestNoAsk.price) * 100).toFixed(1)}¢</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <DollarSign className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <div className="font-bold text-gray-900">{formatVolume(market.volume)}</div>
            <div className="text-gray-500 text-xs">Volume</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <TrendingUp className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <div className="font-bold text-gray-900">{formatVolume(market.openInterest)}</div>
            <div className="text-gray-500 text-xs">Open Interest</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Clock className="w-4 h-4 mx-auto text-gray-400 mb-1" />
            <div className="font-bold text-gray-900">{market.closeTime ? formatDate(market.closeTime) : "Open"}</div>
            <div className="text-gray-500 text-xs">Closes</div>
          </div>
        </div>

        <div className="border-t-2 border-gray-100 pt-6">
          <h3 className="font-bold text-gray-900 mb-4">Trade</h3>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSide("yes")}
              className={`flex-1 py-3 rounded-lg border-2 border-black font-bold transition-all ${
                side === "yes"
                  ? "bg-green-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              data-testid="button-trade-yes"
            >
              Buy {market.yesLabel}
            </button>
            <button
              onClick={() => setSide("no")}
              className={`flex-1 py-3 rounded-lg border-2 border-black font-bold transition-all ${
                side === "no"
                  ? "bg-red-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              data-testid="button-trade-no"
            >
              Buy {market.noLabel}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USDC)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500"
                data-testid="input-trade-amount"
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price per share:</span>
                  <span className="font-bold">
                    {side === "yes" 
                      ? `${market.yesPrice || 50}¢`
                      : `${market.noPrice || 50}¢`
                    }
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Shares you get:</span>
                  <span className="font-bold">
                    ~{(parseFloat(amount) / ((side === "yes" ? market.yesPrice : market.noPrice) || 50) * 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Potential payout:</span>
                  <span className="font-bold text-green-600">
                    ${(parseFloat(amount) / ((side === "yes" ? market.yesPrice : market.noPrice) || 50) * 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              disabled={!amount || parseFloat(amount) <= 0}
              className={`w-full py-4 rounded-xl border-2 border-black font-black text-lg transition-all ${
                side === "yes"
                  ? "bg-green-400 hover:bg-green-500 text-black"
                  : "bg-red-400 hover:bg-red-500 text-black"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}
              data-testid="button-place-trade"
            >
              {side === "yes" ? `Buy ${market.yesLabel}` : `Buy ${market.noLabel}`}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Trading via DFlow + Kalshi. Requires connected wallet with USDC.
            </p>
          </div>
        </div>

        {market.rules && (
          <div className="border-t-2 border-gray-100 pt-4">
            <h4 className="font-bold text-gray-900 mb-2">Resolution Rules</h4>
            <p className="text-sm text-gray-600">{market.rules}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PredictionDetail() {
  const { ticker } = useParams<{ ticker: string }>();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["/api/dflow/events", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/dflow/events?limit=100&withNestedMarkets=true`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const event = eventsData?.events?.find((e: DFlowEvent) => e.ticker === ticker);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="h-96 bg-gray-200 border-2 border-black rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-black rounded-xl p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Event Not Found</h2>
            <p className="text-gray-600 mb-4">This prediction market may have expired or doesn't exist.</p>
            <Link
              href="/predictions"
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 border-2 border-black rounded-lg font-bold hover:bg-yellow-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href="/predictions"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium mb-6 transition-colors"
          data-testid="link-back-predictions"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-start gap-4">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-20 h-20 rounded-xl object-cover border-2 border-black"
              />
            )}
            <div>
              <h1 className="text-2xl font-black text-gray-900">{event.title}</h1>
              {event.subtitle && (
                <p className="text-gray-500 mt-1">{event.subtitle}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatVolume(event.volume)} volume
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {formatVolume(event.volume24h)} 24h
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {event.markets.map((market: DFlowMarket) => (
              <MarketCard key={market.ticker} market={market} />
            ))}
          </div>

          <div className="bg-yellow-50 border-2 border-black rounded-xl p-4 text-center">
            <p className="text-sm text-gray-700">
              Markets powered by{" "}
              <a
                href="https://dflow.net"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-yellow-700 hover:underline"
              >
                DFlow <ExternalLink className="w-3 h-3 inline" />
              </a>
              {" "}with liquidity from{" "}
              <a
                href="https://kalshi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-yellow-700 hover:underline"
              >
                Kalshi <ExternalLink className="w-3 h-3 inline" />
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
