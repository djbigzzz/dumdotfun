import { Layout } from "@/components/layout";

import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { Trophy, Crown, Star, Diamond, Shield, Flame, TrendingUp, Sparkles, Timer, ChevronUp, ArrowUpDown } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

interface LeaderboardEntry {
  walletAddress: string;
  displayName?: string | null;
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

const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  solana_god:    { label: "On-Chain God",   color: "#00E5FF", icon: <Diamond   className="w-3 h-3" /> },
  rug_proof:     { label: "Diamond Hands",  color: "#4ADE80", icon: <Shield    className="w-3 h-3" /> },
  degen:         { label: "Full Degen",     color: "#FACC15", icon: <Flame     className="w-3 h-3" /> },
  bonding_curve: { label: "Curve Rider",    color: "#3B82F6", icon: <TrendingUp className="w-3 h-3" /> },
  pill_popper:   { label: "Fresh Pill",     color: "#EC4899", icon: <Star      className="w-3 h-3" /> },
};

type SortDir = "asc" | "desc";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border bg-gradient-to-br from-yellow-300 to-yellow-500 text-black border-yellow-600 shadow-[0_0_12px_rgba(234,179,8,0.3)]">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border bg-gradient-to-br from-gray-200 to-gray-400 text-black border-gray-500">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border bg-gradient-to-br from-amber-400 to-amber-600 text-black border-amber-700">
        3
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-gray-400 bg-gray-100">
      {rank}
    </div>
  );
}

function LeaderboardRow({ entry, rank, isYou }: {
  entry: LeaderboardEntry;
  rank: number;
  isYou: boolean;
}) {
  const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.pill_popper;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.02, 0.4) }}
      className={`grid grid-cols-[2rem_2.25rem_1fr_auto_auto] items-center gap-3 px-4 py-3.5 transition-colors ${
        isYou
          ? "bg-red-50/80 border-l-2 border-l-red-500"
          : "hover:bg-gray-50"
      }`}
      data-testid={`leaderboard-entry-${rank}`}
    >
      <RankBadge rank={rank} />

      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
        entry.ogNftMint
          ? "bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-400"
          : "bg-gray-100 border-2 border-black"
      }`}>
        <span className={`text-xs font-black ${entry.ogNftMint ? "text-white" : "text-black"}`}>
          {(entry.displayName || entry.walletAddress).slice(0, 2).toUpperCase()}
        </span>
      </div>

      <a
        href={`https://solscan.io/account/${entry.walletAddress}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0"
      >
        <span className={`text-sm font-bold cursor-pointer hover:underline block truncate ${
          entry.displayName ? "" : "font-mono"
        } ${isYou ? "text-red-500" : "text-black"}`}>
          {entry.displayName || `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}`}
          {isYou && <span className="ml-1.5 text-[10px] opacity-60">(you)</span>}
        </span>
      </a>

      <span
        className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
        style={{ color: tierCfg.color, backgroundColor: `${tierCfg.color}18` }}
      >
        {tierCfg.icon}
        {tierCfg.label}
      </span>

      <div className="flex items-center justify-end gap-1 min-w-[72px]">
        <Sparkles className="w-3 h-3 text-red-500 flex-shrink-0" />
        <span className={`text-sm font-black font-mono tabular-nums ${isYou ? "text-red-500" : "text-black"}`}>
          {entry.totalPoints.toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  usePageTitle("/leaderboard");
  const { connectedWallet } = useWallet();
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
            <h1 className="text-2xl font-black mb-1 text-black" data-testid="text-leaderboard-title">
              Leaderboard{" "}
              <span className="text-red-500">
                <Sparkles className="w-5 h-5 inline -mt-0.5" /> points
              </span>
            </h1>
          </div>

          {activeSeason && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="mb-3">
                <h2 className="text-xl font-black text-black">
                  Season {activeSeason.number}:{" "}
                  <span className="text-red-500">{activeSeason.name}</span>
                </h2>
                {activeSeason.subtitle && (
                  <p className="text-xs mt-1 max-w-lg text-gray-500">{activeSeason.subtitle}</p>
                )}
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Timer className="w-3.5 h-3.5" />
                  Day {daysSinceStart} &middot; Ends at mainnet launch
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <Crown className="w-3.5 h-3.5" />
                  Points carry over to mainnet
                </div>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin w-10 h-10 border-4 rounded-full border-black border-t-transparent" />
              <span className="text-sm font-bold text-gray-400">Loading rankings...</span>
            </div>
          ) : sortedEntries.length > 0 ? (
            <div className="rounded-xl overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="grid grid-cols-[2rem_2.25rem_1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-gray-50 text-gray-400 border-b border-gray-100">
                <div className="flex items-center gap-1">
                  #
                  <button
                    onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="hover:opacity-70 transition-opacity"
                    data-testid="button-sort-place"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
                <div />
                <div>User</div>
                <div className="hidden sm:block">Tier</div>
                <div className="flex items-center gap-1 justify-end">
                  Points
                  <button
                    onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="hover:opacity-70 transition-opacity"
                    data-testid="button-sort-score"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {sortedEntries.map((entry, i) => {
                  const rank = sortDir === "desc" ? i + 1 : sortedEntries.length - i;
                  const isYou = entry.walletAddress === connectedWallet;
                  return (
                    <div
                      key={entry.walletAddress}
                      className={i > 0 ? "border-t border-gray-50" : ""}
                    >
                      <LeaderboardRow
                        entry={entry}
                        rank={rank}
                        isYou={isYou}
                      />
                    </div>
                  );
                })}
              </AnimatePresence>

              {currentUserEntry && (
                <>
                  <div className="border-t-2 border-dashed border-gray-200" />
                  <div className="px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 bg-gray-50">
                    <ChevronUp className="w-3 h-3 inline mr-1" />
                    Your Position
                  </div>
                  <LeaderboardRow
                    entry={currentUserEntry}
                    rank={sortedEntries.length + 1}
                    isYou={true}
                  />
                </>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-16 text-center border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-200" />
              <p className="text-xl font-black mb-2 text-black">No rankings yet</p>
              <p className="text-sm mb-6 text-gray-500">
                Be the first to earn points by completing quests!
              </p>
              <Link href="/quests">
                <span
                  className="inline-block px-6 py-3 rounded-xl font-black text-sm cursor-pointer transition-all bg-red-500 text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]"
                  data-testid="link-start-quests"
                >
                  Start Earning
                </span>
              </Link>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-xl p-5 border border-gray-200 bg-gray-50"
          >
            <h3 className="text-sm font-black mb-3 text-black">Tier System</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[
                { key: "pill_popper",   pts: "0",      label: "Fresh Pill" },
                { key: "bonding_curve", pts: "500",    label: "Curve Rider" },
                { key: "degen",         pts: "2,000",  label: "Full Degen" },
                { key: "rug_proof",     pts: "5,000",  label: "Diamond Hands" },
                { key: "solana_god",    pts: "10,000", label: "On-Chain God" },
              ].map(({ key, pts, label }) => {
                const cfg = TIER_CONFIG[key];
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-xs bg-white border border-gray-200 text-center"
                  >
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span className="font-black text-black text-[11px]">{label}</span>
                    <span className="text-gray-400 font-mono text-[10px]">{pts}+ pts</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}
