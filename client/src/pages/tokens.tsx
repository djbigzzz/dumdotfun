import { Layout } from "@/components/layout";
import { TokenCard } from "@/components/token-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Loader2, AlertCircle, Rocket, Search, Grid3X3, List, Flame, Zap, Clock, TrendingUp, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { usePrivacy } from "@/lib/privacy-context";

interface TokenPrediction {
  id: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  status: string;
}

interface Token {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  predictions?: TokenPrediction[];
}

interface SolPrice {
  price: number;
  currency: string;
}

type FilterTab = "movers" | "live" | "new" | "marketcap" | "oldest";
type ViewMode = "grid" | "table";

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(2)}`;
  return "$0.00";
}

export default function TokensPage() {
  const { privateMode } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("new");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const trendingRef = useRef<HTMLDivElement>(null);

  const { data: tokens, isLoading, error } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const { data: solPrice } = useQuery<SolPrice>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      const data = await res.json();
      if (typeof window !== "undefined") {
        (window as any).lastSolPrice = data.price;
      }
      return data;
    },
    refetchInterval: 30000,
  });

  const scrollTrending = (direction: "left" | "right") => {
    if (trendingRef.current) {
      const scrollAmount = 320;
      trendingRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const filteredTokens = tokens?.filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedTokens = [...filteredTokens].sort((a, b) => {
    switch (activeFilter) {
      case "movers":
        return b.bondingCurveProgress - a.bondingCurveProgress;
      case "marketcap":
        return b.marketCapSol - a.marketCapSol;
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "new":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const trendingTokens = [...filteredTokens]
    .sort((a, b) => b.marketCapSol - a.marketCapSol)
    .slice(0, 8);

  const cardStyle = privateMode 
    ? "bg-black border-2 border-[#4ADE80]" 
    : "bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const filterTabs: { id: FilterTab; label: string; icon: React.ReactNode }[] = [
    { id: "movers", label: "Movers", icon: <Flame className="w-4 h-4" /> },
    { id: "live", label: "Live", icon: <Zap className="w-4 h-4" /> },
    { id: "new", label: "New", icon: <Sparkles className="w-4 h-4" /> },
    { id: "marketcap", label: "Market cap", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "oldest", label: "Oldest", icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Now Trending Section */}
        {trendingTokens.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-black flex items-center gap-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                <Flame className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
                {privateMode ? "> NOW_TRENDING" : "Now Trending"}
              </h2>
              <div className="flex gap-1">
                <button 
                  onClick={() => scrollTrending("left")} 
                  className={`p-1.5 border-2 rounded transition-all ${privateMode ? "border-[#4ADE80]/30 text-[#4ADE80] hover:border-[#4ADE80]" : "border-gray-300 hover:border-black"}`}
                  data-testid="button-scroll-left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => scrollTrending("right")} 
                  className={`p-1.5 border-2 rounded transition-all ${privateMode ? "border-[#4ADE80]/30 text-[#4ADE80] hover:border-[#4ADE80]" : "border-gray-300 hover:border-black"}`}
                  data-testid="button-scroll-right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div 
              ref={trendingRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {trendingTokens.map((token, index) => (
                <Link key={token.mint} href={`/token/${token.mint}`}>
                  <motion.div 
                    whileHover={{ y: -2 }}
                    className={`flex-shrink-0 w-72 p-3 cursor-pointer transition-all ${
                      privateMode 
                        ? "bg-black border-2 border-[#4ADE80]/50 hover:border-[#4ADE80]" 
                        : "bg-gradient-to-br from-red-500 to-red-600 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                    data-testid={`trending-card-${token.mint}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border ${privateMode ? "border-[#4ADE80]/30" : "border-black/20"}`}>
                        {token.imageUri ? (
                          <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center font-black text-xl ${privateMode ? "bg-black text-[#4ADE80]" : "bg-red-700 text-white"}`}>
                            {token.symbol[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm truncate ${privateMode ? "text-[#4ADE80]" : "text-white"}`}>
                          {token.name}
                        </div>
                        <div className={`text-xs ${privateMode ? "text-[#4ADE80]/70" : "text-white/80"}`}>
                          ${token.symbol}
                        </div>
                        <div className={`mt-1 text-xs font-mono ${privateMode ? "text-white" : "text-white"}`}>
                          MC: {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                        </div>
                        <div className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-white/70"}`}>
                          {getTimeAgo(new Date(token.createdAt))} ago
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Header with Create Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className={`text-2xl font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
              {privateMode ? "> EXPLORE" : "Explore"}
            </h1>
          </div>
          
          <Link href="/create">
            <motion.button
              whileHover={{ y: -2, x: -2 }}
              whileTap={{ y: 0, x: 0 }}
              className={`flex items-center gap-2 font-bold px-5 py-2.5 border-2 transition-all ${
                privateMode 
                  ? "bg-[#4ADE80] text-black border-[#4ADE80] hover:shadow-[0_0_15px_rgba(57,255,20,0.3)] font-mono" 
                  : "bg-red-500 text-white border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }`}
              data-testid="button-create-token"
            >
              <Plus className="w-4 h-4" />
              {privateMode ? "LAUNCH" : "Create coin"}
            </motion.button>
          </Link>
        </div>

        {/* Filter Tabs and View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 md:py-1.5 text-sm font-bold border-2 transition-all flex-shrink-0 ${
                  activeFilter === tab.id
                    ? privateMode 
                      ? "bg-[#4ADE80] text-black border-[#4ADE80]" 
                      : "bg-black text-white border-black"
                    : privateMode 
                      ? "bg-black text-[#4ADE80]/70 border-[#4ADE80]/30 hover:border-[#4ADE80]" 
                      : "bg-white text-gray-600 border-gray-300 hover:border-black rounded-full"
                }`}
                data-testid={`filter-${tab.id}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className={`w-full pl-9 pr-3 py-2 text-sm border-2 font-mono focus:outline-none transition-all ${
                  privateMode 
                    ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                    : "bg-white border-gray-300 rounded-lg focus:border-black"
                }`}
                data-testid="input-search-tokens"
              />
            </div>

            {/* View Toggle */}
            <div className={`flex border-2 ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300 rounded-lg overflow-hidden"}`}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-all ${
                  viewMode === "grid"
                    ? privateMode ? "bg-[#4ADE80] text-black" : "bg-black text-white"
                    : privateMode ? "bg-black text-[#4ADE80]/50" : "bg-white text-gray-400"
                }`}
                data-testid="view-grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 transition-all ${
                  viewMode === "table"
                    ? privateMode ? "bg-[#4ADE80] text-black" : "bg-black text-white"
                    : privateMode ? "bg-black text-[#4ADE80]/50" : "bg-white text-gray-400"
                }`}
                data-testid="view-table"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Token List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className={`w-12 h-12 mb-4 ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
            <p className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>Failed to load tokens</p>
          </div>
        ) : sortedTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Rocket className={`w-16 h-16 mb-4 ${privateMode ? "text-[#4ADE80]/30" : "text-gray-300"}`} />
            <h3 className={`text-xl font-bold mb-2 ${privateMode ? "text-white" : "text-gray-700"}`}>
              {searchQuery ? "No tokens found" : "No tokens yet"}
            </h3>
            <p className={`mb-6 max-w-md ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
              {searchQuery ? "Try a different search term" : "Be the first to launch a token!"}
            </p>
            {!searchQuery && (
              <Link href="/create">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className={`font-bold px-6 py-3 border-2 ${
                    privateMode 
                      ? "bg-[#4ADE80] text-black border-[#4ADE80]" 
                      : "bg-red-500 text-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  Launch First Token
                </motion.button>
              </Link>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTokens.map((token) => (
              <TokenCard key={token.mint} token={token} solPrice={solPrice?.price || null} />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className={`${cardStyle} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-xs border-b-2 ${privateMode ? "text-[#4ADE80]/70 border-[#4ADE80]/30" : "text-gray-500 border-gray-200"}`}>
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">COIN</th>
                    <th className="text-right py-3 px-4">MCAP</th>
                    <th className="text-right py-3 px-4">PROGRESS</th>
                    <th className="text-right py-3 px-4">AGE</th>
                    <th className="text-right py-3 px-4">CREATOR</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTokens.map((token, index) => (
                    <Link key={token.mint} href={`/token/${token.mint}`}>
                      <tr 
                        className={`cursor-pointer border-b transition-all ${
                          privateMode 
                            ? "border-[#4ADE80]/20 hover:bg-[#4ADE80]/10" 
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                        data-testid={`table-row-${token.mint}`}
                      >
                        <td className={`py-3 px-4 font-mono text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                          #{index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border ${privateMode ? "border-[#4ADE80]/30" : "border-gray-200"}`}>
                              {token.imageUri ? (
                                <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center font-bold ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-100 text-red-500"}`}>
                                  {token.symbol[0]}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className={`font-bold text-sm ${privateMode ? "text-white" : "text-gray-900"}`}>
                                {token.name}
                              </div>
                              <div className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                                ${token.symbol}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>
                          {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className={`w-16 h-2 rounded-full overflow-hidden ${privateMode ? "bg-black border border-[#4ADE80]/30" : "bg-gray-200"}`}>
                              <div 
                                className={`h-full ${
                                  privateMode 
                                    ? "bg-[#4ADE80]" 
                                    : token.bondingCurveProgress > 80 ? "bg-green-500" : token.bondingCurveProgress > 50 ? "bg-yellow-500" : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]" : "text-gray-600"}`}>
                              {token.bondingCurveProgress.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className={`py-3 px-4 text-right text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                          {getTimeAgo(new Date(token.createdAt))}
                        </td>
                        <td className={`py-3 px-4 text-right text-sm font-mono ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                          {token.creatorAddress.slice(0, 6)}...
                        </td>
                      </tr>
                    </Link>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
