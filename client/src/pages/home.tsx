import { Layout } from "@/components/layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Flame, TrendingUp, Zap, Crown, Radio, ArrowUpRight, ArrowDownRight, Search, X, Target, Clock, Users } from "lucide-react";
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

interface Market {
  id: string;
  question: string;
  description: string | null;
  imageUri: string | null;
  creatorAddress: string;
  marketType: string;
  tokenMint: string | null;
  resolutionDate: string;
  status: string;
  outcome: string | null;
  yesPool: number;
  noPool: number;
  totalVolume: number;
  yesOdds: number;
  noOdds: number;
  createdAt: string;
}

interface LiveActivity {
  id: string;
  type: "trade" | "create" | "complete" | "bet" | "market";
  mint?: string;
  marketId?: string;
  name?: string;
  symbol?: string;
  question?: string;
  tradeType?: "buy" | "sell";
  side?: "yes" | "no";
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

function MarketCard({ market, index }: { market: Market; index: number }) {
  const timeLeft = new Date(market.resolutionDate).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  
  const isResolved = market.status === "resolved";
  const isExpired = timeLeft <= 0 && !isResolved;

  return (
    <Link href={`/market/${market.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className={`bg-zinc-900 border rounded-lg p-4 cursor-pointer transition-all group ${
          isResolved 
            ? "border-gray-600/30 opacity-75" 
            : isExpired 
            ? "border-yellow-600/30" 
            : "border-yellow-500/30 hover:border-yellow-400/60"
        }`}
        data-testid={`card-market-${market.id}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-yellow-600/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
            <Target className="w-6 h-6 text-yellow-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight group-hover:text-yellow-400 transition-colors line-clamp-2">
              {market.question}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${
                market.marketType === "token" 
                  ? "bg-red-600/20 text-red-400" 
                  : "bg-blue-600/20 text-blue-400"
              }`}>
                {market.marketType === "token" ? "TOKEN" : "GENERAL"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="bg-green-600/20 border border-green-600/40 rounded py-2 px-3 text-center hover:bg-green-600/30 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <span className="block text-green-400 font-black text-lg">{market.yesOdds}%</span>
            <span className="block text-xs text-gray-400">YES</span>
          </button>
          <button
            className="bg-red-600/20 border border-red-600/40 rounded py-2 px-3 text-center hover:bg-red-600/30 transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <span className="block text-red-400 font-black text-lg">{market.noOdds}%</span>
            <span className="block text-xs text-gray-400">NO</span>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {market.totalVolume.toFixed(2)} SOL
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {isResolved ? (
              <span className="text-gray-400">RESOLVED: {market.outcome?.toUpperCase()}</span>
            ) : isExpired ? (
              <span className="text-yellow-400">PENDING</span>
            ) : daysLeft > 0 ? (
              `${daysLeft}d ${hoursLeft}h`
            ) : (
              `${hoursLeft}h left`
            )}
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
  const [activeTab, setActiveTab] = useState<"tokens" | "predictions">("tokens");
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

  const { data: tokens, isLoading: tokensLoading, error: tokensError } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: markets, isLoading: marketsLoading, error: marketsError } = useQuery<Market[]>({
    queryKey: ["markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const filteredTokens = useMemo(() => {
    if (!tokens) return [];
    
    let filtered = [...tokens];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query) ||
          token.mint.toLowerCase().includes(query)
      );
    }
    
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

  const filteredMarkets = useMemo(() => {
    if (!markets) return [];
    
    let filtered = [...markets];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (market) => market.question.toLowerCase().includes(query)
      );
    }
    
    filtered.sort((a, b) => b.totalVolume - a.totalVolume);
    
    return filtered;
  }, [markets, searchQuery]);

  const isLoading = activeTab === "tokens" ? tokensLoading : marketsLoading;
  const error = activeTab === "tokens" ? tokensError : marketsError;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("tokens")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
                  activeTab === "tokens"
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="tab-tokens"
              >
                <Flame className="w-4 h-4" />
                TOKENS
              </button>
              <button
                onClick={() => setActiveTab("predictions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
                  activeTab === "predictions"
                    ? "bg-yellow-500 text-black"
                    : "text-gray-400 hover:text-white"
                }`}
                data-testid="tab-predictions"
              >
                <Target className="w-4 h-4" />
                PREDICTIONS
              </button>
            </div>
            <span 
              className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 ${
                wsConnected 
                  ? "bg-green-600/20 border border-green-600/50 text-green-400" 
                  : "bg-red-600/20 border border-red-600/50 text-red-400"
              }`}
              data-testid="status-websocket"
            >
              <Radio className={`w-3 h-3 ${wsConnected ? "animate-pulse" : ""}`} />
              {wsConnected ? "LIVE" : "..."}
            </span>
          </div>

          <Link href={activeTab === "tokens" ? "/create" : "/create-market"}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`font-black py-2 px-4 rounded uppercase text-sm border ${
                activeTab === "tokens"
                  ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black border-green-400/50"
                  : "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black border-yellow-300/50"
              }`}
              data-testid={activeTab === "tokens" ? "button-create-token" : "button-create-market"}
            >
              + CREATE {activeTab === "tokens" ? "TOKEN" : "MARKET"}
            </motion.button>
          </Link>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={activeTab === "tokens" ? "Search tokens..." : "Search prediction markets..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none transition-colors ${
                activeTab === "tokens" 
                  ? "border-red-600/30 focus:border-red-500" 
                  : "border-yellow-600/30 focus:border-yellow-500"
              }`}
              data-testid="input-search"
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

          {activeTab === "tokens" && (
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
          )}
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
                        NEW: {activity.symbol || activity.mint?.slice(0, 6)}
                      </>
                    ) : activity.type === "complete" ? (
                      <>
                        <Crown className="w-3 h-3 text-yellow-500" />
                        GRADUATED: {activity.mint?.slice(0, 6)}
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
              <div key={i} className="bg-zinc-900 border border-zinc-700/20 rounded-lg p-4 animate-pulse">
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
          <div className="text-center py-12 space-y-4">
            <p className="text-red-500 font-mono">Failed to load {activeTab}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              Try again
            </button>
          </div>
        ) : activeTab === "tokens" ? (
          filteredTokens.length > 0 ? (
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
          )
        ) : (
          filteredMarkets && filteredMarkets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMarkets.map((market, index) => (
                <MarketCard key={market.id} market={market} index={index} />
              ))}
            </div>
          ) : markets && markets.length > 0 ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-gray-400 font-mono">No markets match your search</p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-500 text-sm hover:text-gray-400 underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <Target className="w-16 h-16 text-yellow-500/50 mx-auto" />
              <p className="text-gray-400 font-mono">No prediction markets yet</p>
              <p className="text-gray-500 text-sm">Create the first one!</p>
              <Link href="/create-market">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black py-3 px-6 rounded uppercase border border-yellow-300/50"
                >
                  CREATE PREDICTION MARKET
                </motion.button>
              </Link>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
