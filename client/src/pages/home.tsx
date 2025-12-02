import { Layout } from "@/components/layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Flame, TrendingUp, Zap, Crown, Radio, ArrowUpRight, ArrowDownRight, Search, X } from "lucide-react";
import { useWebSocket } from "@/lib/use-websocket";
import { useState, useEffect, useCallback, useMemo } from "react";

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
}

interface LiveActivity {
  id: string;
  type: "trade" | "create" | "complete";
  mint: string;
  name?: string;
  symbol?: string;
  tradeType?: "buy" | "sell";
  solAmount?: number;
  timestamp: number;
}

function TokenCard({ token, index }: { token: Token; index: number }) {
  const progressColor = token.bondingCurveProgress > 80 
    ? "bg-green-500" 
    : token.bondingCurveProgress > 50 
    ? "bg-yellow-500" 
    : "bg-red-500";

  return (
    <Link href={`/token/${token.mint}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="bg-zinc-900 border border-red-600/30 rounded-lg p-4 cursor-pointer hover:border-red-500/60 transition-all group"
        data-testid={`card-token-${token.mint}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-red-600/20 overflow-hidden flex-shrink-0">
            {token.imageUri ? (
              <img 
                src={token.imageUri} 
                alt={token.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-red-500 font-black text-lg">
                {token.symbol[0]}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-white truncate group-hover:text-red-400 transition-colors">
                {token.name}
              </h3>
              {index === 0 && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <p className="text-xs font-mono text-gray-400">${token.symbol}</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-mono text-green-400">
              {token.marketCapSol.toFixed(2)} SOL
            </p>
            <p className="text-xs text-gray-500">mcap</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Bonding Curve</span>
            <span className="font-mono text-yellow-500">{token.bondingCurveProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${token.bondingCurveProgress}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={`h-full ${progressColor} rounded-full`}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono truncate max-w-[100px]">
            {token.creatorAddress.slice(0, 4)}...{token.creatorAddress.slice(-4)}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            NEW
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"trending" | "new" | "graduating" | "graduated">("trending");

  const handleWebSocketUpdate = useCallback((update: any) => {
    if (update.type === "connected") {
      setWsConnected(true);
      return;
    }

    if (update.type === "trade" || update.type === "create" || update.type === "complete") {
      const activity: LiveActivity = {
        id: `${update.mint}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: update.type,
        mint: update.mint,
        name: update.name,
        symbol: update.symbol,
        tradeType: update.tradeType,
        solAmount: update.solAmount,
        timestamp: update.timestamp || Date.now(),
      };

      setLiveActivities((prev) => [activity, ...prev.slice(0, 9)]);

      if (update.type === "trade" && update.mint) {
        queryClient.setQueryData<Token[]>(["tokens"], (oldTokens) => {
          if (!oldTokens) return oldTokens;
          return oldTokens.map((token) => {
            if (token.mint === update.mint) {
              return {
                ...token,
                marketCapSol: update.marketCapSol ?? token.marketCapSol,
                bondingCurveProgress: update.bondingCurveProgress ?? token.bondingCurveProgress,
              };
            }
            return token;
          });
        });
      }
    }
  }, [queryClient]);

  const { isConnected } = useWebSocket({
    onUpdate: handleWebSocketUpdate,
    onConnect: () => setWsConnected(true),
    onDisconnect: () => setWsConnected(false),
  });

  const { data: tokens, isLoading, error } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Filter and search tokens
  const filteredTokens = useMemo(() => {
    if (!tokens) return [];
    
    let filtered = [...tokens];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query) ||
          token.mint.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (activeFilter === "trending") {
      filtered.sort((a, b) => b.marketCapSol - a.marketCapSol);
    } else if (activeFilter === "new") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (activeFilter === "graduating") {
      filtered = filtered.filter((token) => token.bondingCurveProgress >= 80 && token.bondingCurveProgress < 100);
    } else if (activeFilter === "graduated") {
      filtered = filtered.filter((token) => token.bondingCurveProgress >= 100);
    }
    
    return filtered;
  }, [tokens, searchQuery, activeFilter]);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-red-500 flex items-center gap-2">
              <Flame className="w-6 h-6" />
              LIVE TOKENS
            </h2>
            <span 
              className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 ${
                wsConnected 
                  ? "bg-green-600/20 border border-green-600/50 text-green-400" 
                  : "bg-red-600/20 border border-red-600/50 text-red-400"
              }`}
              data-testid="status-websocket"
            >
              <Radio className={`w-3 h-3 ${wsConnected ? "animate-pulse" : ""}`} />
              {wsConnected ? "LIVE" : "CONNECTING..."}
            </span>
          </div>

          <Link href="/create">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-2 px-4 rounded uppercase text-sm border border-green-400/50"
              data-testid="button-create-token"
            >
              + CREATE TOKEN
            </motion.button>
          </Link>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search tokens by name, symbol, or mint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-red-600/30 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              data-testid="input-search-tokens"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveFilter("trending")}
              data-testid="button-filter-trending"
              className={`font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeFilter === "trending"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Trending
            </button>
            <button
              onClick={() => setActiveFilter("new")}
              data-testid="button-filter-new"
              className={`font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeFilter === "new"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              New
            </button>
            <button
              onClick={() => setActiveFilter("graduating")}
              data-testid="button-filter-graduating"
              className={`font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeFilter === "graduating"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Graduating
            </button>
            <button
              onClick={() => setActiveFilter("graduated")}
              data-testid="button-filter-graduated"
              className={`font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeFilter === "graduated"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
              }`}
            >
              <Crown className="w-4 h-4 inline mr-1" />
              Graduated
            </button>
          </div>
        </div>

        {liveActivities.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-gray-400">LIVE ACTIVITY</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <AnimatePresence mode="popLayout">
                {liveActivities.slice(0, 5).map((activity) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                      activity.type === "create"
                        ? "bg-green-600/20 border border-green-600/50 text-green-400"
                        : activity.tradeType === "buy"
                        ? "bg-green-600/20 border border-green-600/30 text-green-400"
                        : "bg-red-600/20 border border-red-600/30 text-red-400"
                    }`}
                    data-testid={`activity-${activity.id}`}
                  >
                    {activity.type === "create" ? (
                      <>
                        <Zap className="w-3 h-3" />
                        NEW: {activity.symbol || activity.mint.slice(0, 6)}
                      </>
                    ) : activity.type === "complete" ? (
                      <>
                        <Crown className="w-3 h-3 text-yellow-500" />
                        GRADUATED: {activity.mint.slice(0, 6)}
                      </>
                    ) : (
                      <>
                        {activity.tradeType === "buy" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {activity.tradeType?.toUpperCase()} {activity.solAmount?.toFixed(2) || "?"} SOL
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-red-600/20 rounded-lg p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-3 h-2 bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 font-mono">Failed to load tokens</p>
            <p className="text-gray-500 text-sm mt-2">Please try again later</p>
          </div>
        ) : tokens && filteredTokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTokens.map((token, index) => (
              <TokenCard key={token.mint} token={token} index={index} />
            ))}
          </div>
        ) : tokens && tokens.length > 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-400 font-mono">No tokens match your search</p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-gray-500 text-sm hover:text-gray-400 underline"
              data-testid="button-clear-filters"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-400 font-mono">No tokens yet</p>
            <p className="text-gray-500 text-sm">Be the first to create one!</p>
            <Link href="/create">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-3 px-6 rounded uppercase border border-green-400/50"
              >
                CREATE YOUR TOKEN
              </motion.button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
