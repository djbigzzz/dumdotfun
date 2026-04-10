import { Layout } from "@/components/layout";
import { TokenCard } from "@/components/token-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Loader2, AlertCircle, Rocket, Search, Grid3X3, List, Flame, Zap, Clock, TrendingUp, ChevronLeft, ChevronRight, Sparkles, Trophy, X, Diamond } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

import { useWallet } from "@/lib/wallet-context";
import { usePageTitle } from "@/hooks/use-page-title";

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

function QuestsTeaser() {
  const { connectedWallet } = useWallet();
  const privateMode = false;

  const { data: pointsData } = useQuery<{
    totalPoints: number;
    tier: string;
    tierLabel: string;
    questDefinitions: { action: string; completed: boolean; repeatable: boolean }[];
  } | null>({
    queryKey: ["points-teaser", connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return null;
      const res = await fetch(`/api/points/${connectedWallet}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!connectedWallet,
  });

  const TIER_COLORS: Record<string, string> = {
    pill_popper: "#EC4899",
    bonding_curve: "#3B82F6",
    degen: "#EAB308",
    rug_proof: "#22C55E",
    solana_god: "#06B6D4",
  };

  const completedCount = pointsData?.questDefinitions?.filter(q => q.completed).length || 0;
  const totalQuests = pointsData?.questDefinitions?.filter(q => !q.repeatable).length || 9;
  const tierColor = TIER_COLORS[pointsData?.tier || "pill_popper"] || "#EC4899";

  return (
    <Link href="/quests">
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="cursor-pointer inline-flex"
        data-testid="banner-quests-teaser"
      >
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
          privateMode
            ? "bg-purple-900/40 border border-purple-500/50 text-purple-300"
            : "bg-purple-600 border-2 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        }`}>
          <Trophy className="w-3.5 h-3.5 text-yellow-300" />
          {connectedWallet && pointsData ? (
            <span>
              <span style={{ color: tierColor }}>{pointsData.tierLabel}</span>
              {" · "}{pointsData.totalPoints.toLocaleString()} pts
              {" · "}{completedCount}/{totalQuests}
            </span>
          ) : (
            <span>Earn Points</span>
          )}
          <ChevronRight className="w-3 h-3" />
        </div>
      </motion.div>
    </Link>
  );
}

const OG_BANNER_DISMISS_KEY = "og_card_banner_dismissed_v1";

function OgCardBanner() {
  const { connectedWallet } = useWallet();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(OG_BANNER_DISMISS_KEY) === "1"; } catch { return false; }
  });

  const { data: pointsData } = useQuery<{ hasOgCard: boolean } | null>({
    queryKey: ["og-banner-check", connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return null;
      const res = await fetch(`/api/points/${connectedWallet}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!connectedWallet,
    staleTime: 60000,
  });

  const dismiss = () => {
    try { localStorage.setItem(OG_BANNER_DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };

  if (dismissed || pointsData?.hasOgCard) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative bg-zinc-950 border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
      data-testid="banner-og-card"
    >
      {/* subtle gold shimmer top border */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-70" />

      {/* dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        data-testid="button-dismiss-og-banner"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-white/40" />
      </button>

      <div className="flex flex-col md:flex-row items-center gap-0">

        {/* ── video card ── */}
        <div className="flex-shrink-0 flex items-center justify-center p-4 md:p-6 md:pr-0">
          <div className="relative w-36 md:w-44">
            {/* glow behind the card */}
            <div className="absolute inset-0 rounded-xl bg-yellow-400/20 blur-xl scale-110 pointer-events-none" />
            <video
              src="/assets/og-card.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="relative w-full rounded-xl border border-yellow-400/30 shadow-[0_0_24px_rgba(234,179,8,0.3)]"
            />
          </div>
        </div>

        {/* ── copy + perks + CTA ── */}
        <div className="flex-1 px-4 pb-5 pt-2 md:px-6 md:py-6 space-y-3">
          {/* headline */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base md:text-lg font-black text-white tracking-tight">DUM OG Card</span>
              <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-black rounded-full border border-green-400 uppercase tracking-wide">FREE</span>
              <span className="px-2 py-0.5 bg-yellow-400/10 text-yellow-400 text-[10px] font-black rounded-full border border-yellow-400/40 uppercase tracking-wide">Early Access</span>
            </div>
            <p className="text-sm text-white/50 font-medium">Lifetime membership NFT — claim yours before it closes</p>
          </div>

          {/* perks grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {[
              { icon: "⚡", label: "1.2x Points Boost", sub: "Forever" },
              { icon: "🏆", label: "+500 Bonus pts", sub: "On claim" },
              { icon: "👑", label: "OG Leaderboard", sub: "Badge" },
              { icon: "🚀", label: "Early Access", sub: "New features" },
              { icon: "🎁", label: "Future Airdrops", sub: "Priority" },
              { icon: "💎", label: "OG Status", sub: "Permanent" },
            ].map((p) => (
              <div key={p.label} className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm leading-none mt-0.5">{p.icon}</span>
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">{p.label}</p>
                  <p className="text-[10px] text-white/40">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link href="/quests">
            <motion.button
              whileHover={{ y: -2, x: -1 }}
              whileTap={{ y: 0, x: 0 }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-yellow-400 text-black text-sm font-black rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 transition-colors"
              data-testid="button-og-card-cta"
            >
              <Diamond className="w-4 h-4" />
              Claim OG Card — FREE
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function TokensPage() {
  usePageTitle("/tokens");
  const privateMode = false;
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
        <OgCardBanner />

        {/* Now Trending Section */}
        {trendingTokens.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-black flex items-center gap-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                <Flame className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
                {privateMode ? "> NOW_TRENDING" : "Now Trending"}
              </h2>
              <div className="flex items-center gap-2">
                <QuestsTeaser />
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
                          <img src={token.imageUri} alt={`${token.name} (${token.symbol}) token`} loading="lazy" className="w-full h-full object-cover" />
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
              <div className="w-full min-w-[600px]">
                <div className={`flex text-xs border-b-2 ${privateMode ? "text-[#4ADE80]/70 border-[#4ADE80]/30" : "text-gray-500 border-gray-200"}`}>
                  <div className="text-left py-3 px-4 w-12">#</div>
                  <div className="text-left py-3 px-4 flex-1">COIN</div>
                  <div className="text-right py-3 px-4 w-24">MCAP</div>
                  <div className="text-right py-3 px-4 w-28">PROGRESS</div>
                  <div className="text-right py-3 px-4 w-16">AGE</div>
                  <div className="text-right py-3 px-4 w-24">CREATOR</div>
                </div>
                <div>
                  {sortedTokens.map((token, index) => (
                    <Link key={token.mint} href={`/token/${token.mint}`}>
                      <div 
                        className={`flex items-center cursor-pointer border-b transition-all ${
                          privateMode 
                            ? "border-[#4ADE80]/20 hover:bg-[#4ADE80]/10" 
                            : "border-gray-100 hover:bg-gray-50"
                        }`}
                        data-testid={`table-row-${token.mint}`}
                      >
                        <div className={`py-3 px-4 w-12 font-mono text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                          #{index + 1}
                        </div>
                        <div className="py-3 px-4 flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border ${privateMode ? "border-[#4ADE80]/30" : "border-gray-200"}`}>
                              {token.imageUri ? (
                                <img src={token.imageUri} alt={`${token.name} (${token.symbol}) token`} loading="lazy" className="w-full h-full object-cover" />
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
                        </div>
                        <div className={`py-3 px-4 w-24 text-right font-mono text-sm font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>
                          {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                        </div>
                        <div className="py-3 px-4 w-28 text-right">
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
                        </div>
                        <div className={`py-3 px-4 w-16 text-right text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                          {getTimeAgo(new Date(token.createdAt))}
                        </div>
                        <div className={`py-3 px-4 w-24 text-right text-sm font-mono ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                          {token.creatorAddress.slice(0, 6)}...
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
