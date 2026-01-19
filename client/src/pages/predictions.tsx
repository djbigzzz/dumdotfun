import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { TrendingUp, Clock, DollarSign, Search, ArrowRight, AlertCircle, Zap, Shield, Lock } from "lucide-react";
import { Layout } from "@/components/layout";
import { PrivacyBadge } from "@/components/privacy-badge";
import { PrivacyIntegrationsCard } from "@/components/privacy-integrations-card";

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
  });
}

function EventCard({ event }: { event: DFlowEvent }) {
  const primaryMarket = event.markets[0];
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-12 h-12 rounded-lg object-cover border-2 border-black"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 text-lg leading-tight line-clamp-2">
              {event.title}
            </h3>
            {event.subtitle && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-1">{event.subtitle}</p>
            )}
          </div>
        </div>

        {primaryMarket && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-green-100 border-2 border-black rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600 font-medium">{primaryMarket.yesLabel}</div>
                <div className="text-xl font-black text-green-600">
                  {primaryMarket.yesPrice !== null ? `${primaryMarket.yesPrice}¢` : "-"}
                </div>
              </div>
              <div className="flex-1 bg-red-100 border-2 border-black rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600 font-medium">{primaryMarket.noLabel}</div>
                <div className="text-xl font-black text-red-600">
                  {primaryMarket.noPrice !== null ? `${primaryMarket.noPrice}¢` : "-"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>Vol: {formatVolume(event.volume)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{primaryMarket.closeTime ? formatDate(primaryMarket.closeTime) : "Open"}</span>
              </div>
            </div>
          </div>
        )}

        <Link
          href={`/prediction/${event.ticker}`}
          className="block w-full py-2 bg-yellow-400 border-2 border-black rounded-lg text-center font-bold text-black hover:bg-yellow-500 transition-colors"
          data-testid={`link-event-${event.ticker}`}
        >
          Trade Now <ArrowRight className="w-4 h-4 inline ml-1" />
        </Link>
      </div>
    </motion.div>
  );
}

function NotConfiguredBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-100 border-2 border-black rounded-xl p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
      <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
      <h3 className="font-black text-xl text-gray-900 mb-2">DFlow Integration Pending</h3>
      <p className="text-gray-600 mb-4">
        Real prediction markets from Kalshi will be available once the DFlow API key is configured.
        The grant application has been submitted for $4,700 in funding.
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        <a
          href="https://dflow.net"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
        >
          Learn About DFlow
        </a>
        <Link
          href="/"
          className="px-6 py-2 bg-white border-2 border-black text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Back to Tokens
        </Link>
      </div>
    </motion.div>
  );
}

export default function PredictionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "volume24h" | "liquidity">("volume");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/dflow/events", sortBy],
    queryFn: async () => {
      const res = await fetch(`/api/dflow/events?limit=24&sort=${sortBy}&withNestedMarkets=true`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/dflow/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const res = await fetch(`/api/dflow/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    enabled: searchQuery.trim().length > 2,
  });

  const events = searchQuery.trim().length > 2 && searchResults?.events
    ? searchResults.events
    : data?.events || [];

  const isConfigured = data?.configured !== false;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-bold text-green-800">
                Confidential Betting Active
              </p>
              <p className="text-xs text-green-700">
                Your bets are stored privately. Solana Privacy Hack 2026 submission.
              </p>
            </div>
          </div>
        </div>

        <PrivacyIntegrationsCard compact />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-black text-gray-900">Prediction Markets</h1>
          </div>
          <p className="text-gray-600">
            Trade on real-world events with Kalshi liquidity via DFlow
          </p>
        </motion.div>

        {!isConfigured ? (
          <NotConfiguredBanner />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search markets..."
                  className="w-full pl-12 pr-4 py-3 bg-white border-2 border-black rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  data-testid="input-search-predictions"
                />
              </div>

              <div className="flex gap-2">
                {(["volume", "volume24h", "liquidity"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={`px-4 py-2 rounded-lg border-2 border-black font-bold transition-all ${
                      sortBy === sort
                        ? "bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid={`button-sort-${sort}`}
                  >
                    {sort === "volume" && "All-Time"}
                    {sort === "volume24h" && "24h Hot"}
                    {sort === "liquidity" && "Liquidity"}
                  </button>
                ))}
              </div>
            </div>

            {isLoading || isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-72 bg-gray-200 border-2 border-black rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load markets. Please try again.</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No markets found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event: DFlowEvent) => (
                  <EventCard key={event.ticker} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
