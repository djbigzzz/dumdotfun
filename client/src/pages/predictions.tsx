import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Clock, DollarSign, Search, AlertCircle, Zap, ExternalLink, Shield } from "lucide-react";
import { Layout } from "@/components/layout";
import { usePageTitle } from "@/hooks/use-page-title";

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

function ProbabilityBar({ yes, no }: { yes: number | null; no: number | null }) {
  const yesVal = yes ?? 50;
  const noVal = no ?? 50;
  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full border border-black/20">
      <div
        className="bg-green-500 transition-all"
        style={{ width: `${yesVal}%` }}
      />
      <div
        className="bg-red-500 transition-all"
        style={{ width: `${noVal}%` }}
      />
    </div>
  );
}

function EventCard({ event }: { event: DFlowEvent }) {
  const primaryMarket = event.markets[0];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col"
    >
      <div className="p-5 space-y-4 flex-1">
        <div className="flex items-start gap-3">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-12 h-12 rounded-lg object-cover border-2 border-black flex-shrink-0"
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
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700 line-clamp-2">
              {primaryMarket.title}
            </p>
            <ProbabilityBar yes={primaryMarket.yesPrice} no={primaryMarket.noPrice} />
            <div className="flex justify-between text-xs font-bold">
              <span className="text-green-600">
                YES {primaryMarket.yesPrice !== null ? `${primaryMarket.yesPrice}¢` : "—"}
              </span>
              <span className="text-red-500">
                NO {primaryMarket.noPrice !== null ? `${primaryMarket.noPrice}¢` : "—"}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-xs">Volume</span>
            </div>
            <p className="font-black text-gray-900">{formatVolume(event.volume)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-1 text-gray-500 mb-1">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs">Open Interest</span>
            </div>
            <p className="font-black text-gray-900">{formatVolume(event.openInterest)}</p>
          </div>
        </div>

        {primaryMarket?.closeTime && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Closes {formatDate(primaryMarket.closeTime)}</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <a
          href={`https://dflow.net/market/${primaryMarket?.ticker ?? ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-yellow-400 border-2 border-black rounded-lg font-bold text-sm hover:bg-yellow-300 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          data-testid={`button-trade-${event.ticker}`}
        >
          Trade on DFlow
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

function DFlowBadge() {
  return (
    <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-2 text-sm">
      <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <span className="text-blue-800 font-semibold">
        MEV-protected · Powered by{" "}
        <a
          href="https://dflow.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-600"
        >
          DFlow
        </a>{" "}
        · Kalshi liquidity
      </span>
    </div>
  );
}

export default function PredictionsPage() {
  usePageTitle("/predictions");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"volume" | "volume24h" | "liquidity">("volume");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/dflow/events", sortBy],
    queryFn: async () => {
      const res = await fetch(`/api/dflow/events?limit=24&sort=${sortBy}&withNestedMarkets=true&status=active`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

  const events: DFlowEvent[] =
    searchQuery.trim().length > 2 && searchResults?.events
      ? searchResults.events
      : data?.events || [];

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-black text-gray-900">Prediction Markets</h1>
          </div>
          <p className="text-gray-600">
            Trade on real-world events with Kalshi liquidity — MEV-protected via DFlow on Solana
          </p>
        </motion.div>

        <DFlowBadge />

        <div className="flex flex-col sm:flex-row gap-4">
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
            <p className="text-gray-600 font-semibold">Failed to load markets. Please try again.</p>
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
      </div>
    </Layout>
  );
}
