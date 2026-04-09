import { Layout } from "@/components/layout";

import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { Trophy, Crown, Star, Diamond, Shield, Flame, TrendingUp, Sparkles, Gift, Timer, ChevronUp, ArrowUpDown } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

interface LeaderboardEntry {
  walletAddress: string;
  totalPoints: number;
  periodPoints?: number;
  tier: string;
  ogNftMint: string | null;
  rank?: number;
}

interface Season {
  id: string;
  name: string;
  subtitle: string | null;
  number: number;
  status: string;
  startDate: string;
  endDate: string | null;
  rewardPool: string | null;
  rewardCurrency: string | null;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; multiplier: string }> = {
  solana_god: { label: "On-Chain God", color: "#00E5FF", icon: <Diamond className="w-3.5 h-3.5" />, multiplier: "+200%" },
  rug_proof: { label: "Diamond Hands", color: "#4ADE80", icon: <Shield className="w-3.5 h-3.5" />, multiplier: "+150%" },
  degen: { label: "Full Degen", color: "#FACC15", icon: <Flame className="w-3.5 h-3.5" />, multiplier: "+100%" },
  bonding_curve: { label: "Curve Rider", color: "#3B82F6", icon: <TrendingUp className="w-3.5 h-3.5" />, multiplier: "+50%" },
  pill_popper: { label: "Fresh Pill", color: "#EC4899", icon: <Star className="w-3.5 h-3.5" />, multiplier: "+0%" },
};

const RANK_REWARDS: Record<number, string> = {
  1: "1.5 SOL",
  2: "1.0 SOL",
  3: "0.75 SOL",
  4: "0.5 SOL",
  5: "0.5 SOL",
  6: "0.25 SOL",
  7: "0.25 SOL",
  8: "0.1 SOL",
  9: "0.1 SOL",
  10: "0.05 SOL",
};

type ViewMode = "seasonal" | "all-time";
type SortDir = "asc" | "desc";

function RankBadge({ rank, privateMode }: { rank: number; privateMode: boolean }) {
  const colors: Record<number, { bg: string; text: string; border: string; shadow: string }> = {
    1: {
      bg: privateMode ? "bg-yellow-500/20" : "bg-gradient-to-br from-yellow-300 to-yellow-500",
      text: privateMode ? "text-yellow-400" : "text-black",
      border: privateMode ? "border-yellow-500/40" : "border-yellow-600",
      shadow: "shadow-[0_0_12px_rgba(234,179,8,0.3)]",
    },
    2: {
      bg: privateMode ? "bg-gray-400/20" : "bg-gradient-to-br from-gray-200 to-gray-400",
      text: privateMode ? "text-gray-300" : "text-black",
      border: privateMode ? "border-gray-400/40" : "border-gray-500",
      shadow: "",
    },
    3: {
      bg: privateMode ? "bg-amber-700/20" : "bg-gradient-to-br from-amber-400 to-amber-600",
      text: privateMode ? "text-amber-500" : "text-black",
      border: privateMode ? "border-amber-600/40" : "border-amber-700",
      shadow: "",
    },
  };

  const config = colors[rank];
  if (config) {
    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border ${config.bg} ${config.text} ${config.border} ${config.shadow}`}>
        {rank}
      </div>
    );
  }

  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
      privateMode ? "text-[#4ADE80]/50 bg-zinc-800/50" : "text-gray-400 bg-gray-100"
    }`}>
      {rank}
    </div>
  );
}

function LeaderboardRow({ entry, rank, isYou, privateMode, reward }: {
  entry: LeaderboardEntry;
  rank: number;
  isYou: boolean;
  privateMode: boolean;
  reward?: string;
}) {
  const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.pill_popper;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.02, 0.4) }}
      className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
        isYou
          ? privateMode ? "bg-[#4ADE80]/8 border-l-2 border-l-[#4ADE80]" : "bg-red-50/80 border-l-2 border-l-red-500"
          : privateMode ? "hover:bg-[#4ADE80]/5" : "hover:bg-gray-50"
      }`}
      data-testid={`leaderboard-entry-${rank}`}
    >
      <RankBadge rank={rank} privateMode={privateMode} />

      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        entry.ogNftMint
          ? "bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-400"
          : privateMode
            ? "bg-zinc-800 border border-[#4ADE80]/20"
            : "bg-gray-100 border-2 border-black"
      }`}>
        <span className={`text-xs font-black ${entry.ogNftMint ? "text-white" : privateMode ? "text-white" : "text-black"}`}>
          {entry.walletAddress.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={`https://solscan.io/account/${entry.walletAddress}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={`font-mono text-sm font-bold cursor-pointer hover:underline block truncate ${
            isYou ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : (privateMode ? "text-white" : "text-black")
          }`}>
            {entry.walletAddress.slice(0, 4)}...{entry.walletAddress.slice(-4)}
            {isYou && <span className="ml-1.5 text-[10px] opacity-60">(you)</span>}
          </span>
        </a>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
          color: tierCfg.color,
          backgroundColor: `${tierCfg.color}15`,
        }}>
          {tierCfg.icon}
          <span className="hidden sm:inline">{tierCfg.multiplier}</span>
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-right min-w-[60px]">
          <div className="flex items-center justify-end gap-1">
            <Sparkles className={`w-3 h-3 ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
            <span className={`text-sm font-black font-mono ${
              isYou ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : (privateMode ? "text-white" : "text-black")
            }`}>
              {entry.totalPoints.toLocaleString()}
            </span>
          </div>
        </div>

        {reward && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap ${
            privateMode
              ? "bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30"
              : "bg-green-100 text-green-700 border border-green-300"
          }`} data-testid={`reward-${rank}`}>
            +{reward}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  usePageTitle("/leaderboard");
  const privateMode = false;
  const { connectedWallet } = useWallet();
  const [viewMode, setViewMode] = useState<ViewMode>("seasonal");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: activeSeason } = useQuery<Season>({
    queryKey: ["active-season"],
    queryFn: async () => {
      const res = await fetch("/api/seasons/active");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "all"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?period=all");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: currentUserPoints } = useQuery({
    queryKey: ["user-points", connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return null;
      const res = await fetch(`/api/points/${connectedWallet}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!connectedWallet,
  });

  const sortedEntries = entries
    ? [...entries].sort((a, b) => sortDir === "desc" ? b.totalPoints - a.totalPoints : a.totalPoints - b.totalPoints)
    : [];

  const isCurrentUserInList = sortedEntries.some(e => e.walletAddress === connectedWallet);
  const currentUserEntry: LeaderboardEntry | null = (!isCurrentUserInList && connectedWallet && currentUserPoints) ? {
    walletAddress: connectedWallet,
    totalPoints: currentUserPoints.totalPoints || 0,
    tier: currentUserPoints.tier || "pill_popper",
    ogNftMint: currentUserPoints.ogNftMint || null,
  } : null;

  const seasonStartDate = activeSeason?.startDate ? new Date(activeSeason.startDate) : null;
  const daysSinceStart = seasonStartDate ? Math.floor((Date.now() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Layout>
      <div className="py-6 pb-24 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl mx-auto px-4"
        >
          <div className="text-center mb-6">
            <h1 className={`text-2xl font-black mb-1 ${privateMode ? "text-white font-mono" : "text-black"}`} data-testid="text-leaderboard-title">
              {privateMode ? "> LEADERBOARD_" : "Leaderboard by"}{" "}
              <span className={privateMode ? "text-[#4ADE80]" : "text-red-500"}>
                <Sparkles className="w-5 h-5 inline -mt-0.5" /> points
              </span>
            </h1>
          </div>

          <div className="flex justify-center gap-1 mb-6">
            <button
              onClick={() => setViewMode("seasonal")}
              className={`px-5 py-2 text-xs font-black rounded-l-lg border-2 transition-all ${
                viewMode === "seasonal"
                  ? privateMode
                    ? "bg-[#4ADE80] text-black border-[#4ADE80]"
                    : "bg-black text-white border-black"
                  : privateMode
                    ? "bg-transparent text-[#4ADE80]/50 border-[#4ADE80]/20"
                    : "bg-white text-gray-400 border-gray-200"
              }`}
              data-testid="button-view-seasonal"
            >
              Seasonal
            </button>
            <button
              onClick={() => setViewMode("all-time")}
              className={`px-5 py-2 text-xs font-black rounded-r-lg border-2 transition-all ${
                viewMode === "all-time"
                  ? privateMode
                    ? "bg-[#4ADE80] text-black border-[#4ADE80]"
                    : "bg-black text-white border-black"
                  : privateMode
                    ? "bg-transparent text-[#4ADE80]/50 border-[#4ADE80]/20"
                    : "bg-white text-gray-400 border-gray-200"
              }`}
              data-testid="button-view-alltime"
            >
              All-time
            </button>
          </div>

          {viewMode === "seasonal" && activeSeason && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div>
                  <h2 className={`text-xl font-black ${privateMode ? "text-white font-mono" : "text-black"}`}>
                    Season {activeSeason.number}:{" "}
                    <span className={privateMode ? "text-[#4ADE80]" : "text-red-500"}>
                      {activeSeason.name}
                    </span>
                  </h2>
                  <p className={`text-xs mt-1 max-w-lg ${privateMode ? "text-white/40 font-mono" : "text-gray-500"}`}>
                    {activeSeason.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  privateMode
                    ? "bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20"
                    : "bg-green-50 text-green-700 border border-green-200"
                }`}>
                  <Gift className="w-3.5 h-3.5" />
                  Reward Pool: {activeSeason.rewardPool} {activeSeason.rewardCurrency}
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  privateMode
                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                }`}>
                  <Trophy className="w-3.5 h-3.5" />
                  Top 10 rewarded
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  privateMode
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                  <Timer className="w-3.5 h-3.5" />
                  Day {daysSinceStart} &middot; Ends at mainnet
                </div>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className={`animate-spin w-10 h-10 border-4 rounded-full ${privateMode ? "border-[#4ADE80] border-t-transparent" : "border-black border-t-transparent"}`} />
              <span className={`text-sm font-bold ${privateMode ? "text-[#4ADE80]/50 font-mono" : "text-gray-400"}`}>
                {privateMode ? "LOADING..." : "Loading rankings..."}
              </span>
            </div>
          ) : sortedEntries.length > 0 ? (
            <div className={`rounded-xl overflow-hidden ${
              privateMode
                ? "border border-[#4ADE80]/20 bg-zinc-900/50"
                : "border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            }`}>
              <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider ${
                privateMode ? "bg-zinc-900 text-[#4ADE80]/40 border-b border-[#4ADE80]/10" : "bg-gray-50 text-gray-400 border-b border-gray-100"
              }`}>
                <div className="flex items-center gap-1">
                  Place
                  <button
                    onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="hover:opacity-70 transition-opacity"
                    data-testid="button-sort-place"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 ml-12">User</div>
                <div className="flex items-center gap-12">
                  <span className="hidden sm:inline">Tier</span>
                  <span className="flex items-center gap-1">
                    Score
                    <button
                      onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                      className="hover:opacity-70 transition-opacity"
                      data-testid="button-sort-score"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </span>
                  {viewMode === "seasonal" && <span className="hidden sm:inline w-16 text-right">Reward</span>}
                </div>
              </div>

              <AnimatePresence>
                {sortedEntries.map((entry, i) => {
                  const rank = sortDir === "desc" ? i + 1 : sortedEntries.length - i;
                  const isYou = entry.walletAddress === connectedWallet;
                  return (
                    <div
                      key={entry.walletAddress}
                      className={i > 0 ? (privateMode ? "border-t border-[#4ADE80]/5" : "border-t border-gray-50") : ""}
                    >
                      <LeaderboardRow
                        entry={entry}
                        rank={rank}
                        isYou={isYou}
                        privateMode={privateMode}
                        reward={viewMode === "seasonal" ? RANK_REWARDS[rank] : undefined}
                      />
                    </div>
                  );
                })}
              </AnimatePresence>

              {currentUserEntry && (
                <>
                  <div className={`${privateMode ? "border-t-2 border-dashed border-[#4ADE80]/20" : "border-t-2 border-dashed border-gray-200"}`} />
                  <div className={`px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest ${
                    privateMode ? "text-[#4ADE80]/30 bg-[#4ADE80]/5" : "text-gray-300 bg-gray-50"
                  }`}>
                    <ChevronUp className="w-3 h-3 inline mr-1" />
                    Your Position
                  </div>
                  <LeaderboardRow
                    entry={currentUserEntry}
                    rank={sortedEntries.length + 1}
                    isYou={true}
                    privateMode={privateMode}
                  />
                </>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-xl p-16 text-center ${
                privateMode
                  ? "border border-[#4ADE80]/20 bg-zinc-900/50"
                  : "border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }`}
            >
              <Trophy className={`w-16 h-16 mx-auto mb-4 ${privateMode ? "text-[#4ADE80]/20" : "text-gray-200"}`} />
              <p className={`text-xl font-black mb-2 ${privateMode ? "text-white" : "text-black"}`}>
                {privateMode ? "NO_DATA_FOUND" : "No rankings yet"}
              </p>
              <p className={`text-sm mb-6 ${privateMode ? "text-[#4ADE80]/50 font-mono" : "text-gray-500"}`}>
                {privateMode ? "// complete quests to earn points" : "Be the first to earn points by completing quests!"}
              </p>
              <Link href="/quests">
                <span className={`inline-block px-6 py-3 rounded-xl font-black text-sm cursor-pointer transition-all ${
                  privateMode
                    ? "bg-[#4ADE80] text-black hover:shadow-[0_0_20px_rgba(74,222,128,0.3)]"
                    : "bg-red-500 text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                }`} data-testid="link-start-quests">
                  {privateMode ? "> START_QUESTS" : "Start Earning"}
                </span>
              </Link>
            </motion.div>
          )}

          {viewMode === "seasonal" && activeSeason && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`mt-6 rounded-xl p-5 ${
                privateMode
                  ? "border border-[#4ADE80]/10 bg-zinc-900/30"
                  : "border border-gray-200 bg-gray-50"
              }`}
            >
              <h3 className={`text-sm font-black mb-3 ${privateMode ? "text-white font-mono" : "text-black"}`}>
                {privateMode ? "> SEASON_REWARDS_" : "Season Reward Distribution"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.entries(RANK_REWARDS).map(([rank, reward]) => (
                  <div key={rank} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                    privateMode
                      ? "bg-zinc-800/50 border border-[#4ADE80]/10"
                      : "bg-white border border-gray-200"
                  }`}>
                    <span className={`font-bold ${
                      Number(rank) <= 3
                        ? Number(rank) === 1 ? "text-yellow-500" : Number(rank) === 2 ? "text-gray-400" : "text-amber-600"
                        : privateMode ? "text-white/50" : "text-gray-500"
                    }`}>
                      #{rank}
                    </span>
                    <span className={`font-black ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                      {reward}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
