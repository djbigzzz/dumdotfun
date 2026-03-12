import { Layout } from "@/components/layout";
import { usePrivacy } from "@/lib/privacy-context";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { Trophy, Crown, Star, Zap, Diamond, Shield, Flame, TrendingUp, Medal, Sparkles, ChevronUp } from "lucide-react";

interface LeaderboardEntry {
  walletAddress: string;
  totalPoints: number;
  periodPoints?: number;
  tier: string;
  ogNftMint: string | null;
  rank?: number;
}

const TIER_COLORS: Record<string, string> = {
  solana_god: "#00E5FF",
  rug_proof: "#4ADE80",
  degen: "#FACC15",
  bonding_curve: "#3B82F6",
  pill_popper: "#EC4899",
};

const TIER_LABELS: Record<string, string> = {
  solana_god: "On-Chain God",
  rug_proof: "Diamond Hands",
  degen: "Full Degen",
  bonding_curve: "Curve Rider",
  pill_popper: "Fresh Pill",
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  solana_god: <Diamond className="w-4 h-4" />,
  rug_proof: <Shield className="w-4 h-4" />,
  degen: <Flame className="w-4 h-4" />,
  bonding_curve: <TrendingUp className="w-4 h-4" />,
  pill_popper: <Star className="w-4 h-4" />,
};

type Period = "all" | "weekly" | "daily";

function PodiumCard({ entry, rank, isYou, privateMode }: { entry: LeaderboardEntry; rank: number; isYou: boolean; privateMode: boolean }) {
  const heights = [160, 200, 130];
  const height = heights[rank === 1 ? 1 : rank === 2 ? 0 : 2];
  const tierColor = TIER_COLORS[entry.tier] || TIER_COLORS.pill_popper;
  const medals = ["", "#FFD700", "#C0C0C0", "#CD7F32"];
  const medalColor = medals[rank];
  const sizes = { 1: "w-16 h-16", 2: "w-14 h-14", 3: "w-12 h-12" };
  const textSizes = { 1: "text-2xl", 2: "text-xl", 3: "text-lg" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank === 1 ? 0.2 : rank === 2 ? 0.1 : 0.3, type: "spring", stiffness: 100 }}
      className={`flex flex-col items-center ${rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"}`}
      style={{ flex: 1 }}
    >
      <div className="relative mb-3">
        <div className={`${sizes[rank as 1|2|3]} rounded-full flex items-center justify-center border-3 ${
          privateMode 
            ? "bg-zinc-900 border-[#4ADE80]/50" 
            : "bg-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        }`} style={{ borderColor: privateMode ? tierColor : undefined }}>
          <span className={`${textSizes[rank as 1|2|3]} font-black ${privateMode ? "text-white" : "text-black"}`}>
            {entry.walletAddress.slice(0, 2)}
          </span>
        </div>
        {rank === 1 && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="absolute -top-3 -right-1"
          >
            <Crown className="w-6 h-6" style={{ color: medalColor, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }} />
          </motion.div>
        )}
        {isYou && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${
              privateMode ? "bg-[#4ADE80] text-black" : "bg-red-500 text-white"
            }`}
          >
            YOU
          </motion.div>
        )}
      </div>

      <Link href={`/user/${entry.walletAddress}`}>
        <span className={`font-mono text-xs font-bold cursor-pointer hover:underline mb-1 ${
          isYou ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : (privateMode ? "text-white" : "text-black")
        }`} data-testid={`podium-wallet-${rank}`}>
          {entry.walletAddress.slice(0, 4)}..{entry.walletAddress.slice(-3)}
        </span>
      </Link>

      <span className="inline-flex items-center gap-1 text-[10px] font-bold mb-2" style={{ color: tierColor }}>
        {TIER_ICONS[entry.tier]}
        {TIER_LABELS[entry.tier]}
      </span>

      <div
        className={`w-full rounded-t-xl flex flex-col items-center justify-start pt-4 relative overflow-hidden ${
          privateMode
            ? "border border-[#4ADE80]/20"
            : "border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        }`}
        style={{
          height: `${height}px`,
          background: privateMode
            ? `linear-gradient(180deg, ${tierColor}15 0%, ${tierColor}05 100%)`
            : rank === 1 ? "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%)"
            : rank === 2 ? "linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)"
            : "linear-gradient(180deg, #FED7AA 0%, #FDBA74 100%)",
        }}
      >
        <span className={`text-4xl font-black mb-1 ${privateMode ? "" : ""}`} style={{ color: privateMode ? tierColor : medalColor }}>
          #{rank}
        </span>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className={`text-lg font-black font-mono ${privateMode ? "text-white" : "text-black"}`}
          data-testid={`podium-points-${rank}`}
        >
          {entry.totalPoints.toLocaleString()}
        </motion.span>
        <span className={`text-[10px] font-bold uppercase ${privateMode ? "text-white/40" : "text-black/40"}`}>
          points
        </span>
        {entry.ogNftMint && (
          <span className="mt-1 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
            OG 1.5x
          </span>
        )}
        {privateMode && (
          <div className="absolute inset-0 pointer-events-none opacity-5"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(74,222,128,0.3) 3px, rgba(74,222,128,0.3) 4px)" }}
          />
        )}
      </div>
    </motion.div>
  );
}

export default function Leaderboard() {
  const { privateMode } = usePrivacy();
  const { connectedWallet } = useWallet();
  const [period, setPeriod] = useState<Period>("all");

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?period=${period}`);
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

  const top3 = entries?.slice(0, 3) || [];
  const rest = entries?.slice(3) || [];

  const isCurrentUserInList = entries?.some(e => e.walletAddress === connectedWallet);
  const currentUserEntry: LeaderboardEntry | null = (!isCurrentUserInList && connectedWallet && currentUserPoints) ? {
    walletAddress: connectedWallet,
    totalPoints: currentUserPoints.totalPoints || 0,
    tier: currentUserPoints.tier || "pill_popper",
    ogNftMint: currentUserPoints.ogNftMint || null,
  } : null;

  const getPoints = (entry: LeaderboardEntry) => {
    return period !== "all" && entry.periodPoints !== undefined ? entry.periodPoints : entry.totalPoints;
  };

  return (
    <Layout>
      <div className="py-6 pb-24 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl mx-auto px-4"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block mb-3"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                privateMode
                  ? "bg-[#4ADE80]/10 border border-[#4ADE80]/30"
                  : "bg-yellow-100 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }`}>
                <Trophy className={`w-8 h-8 ${privateMode ? "text-[#4ADE80]" : "text-yellow-600"}`} />
              </div>
            </motion.div>
            <h1 className={`text-3xl font-black mb-1 ${privateMode ? "text-white font-mono" : "text-black"}`} data-testid="text-leaderboard-title">
              {privateMode ? "> LEADERBOARD_" : "Leaderboard"}
            </h1>
            <p className={`text-sm ${privateMode ? "text-[#4ADE80]/50 font-mono" : "text-gray-500"}`}>
              {privateMode ? "// ranking the top degens" : "Who's stacking the most points?"}
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {(["all", "weekly", "daily"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 text-xs font-black uppercase rounded-xl border-2 transition-all ${
                  period === p
                    ? privateMode
                      ? "bg-[#4ADE80] text-black border-[#4ADE80] shadow-[0_0_20px_rgba(74,222,128,0.3)]"
                      : "bg-black text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    : privateMode
                      ? "bg-transparent text-[#4ADE80]/50 border-[#4ADE80]/20 hover:border-[#4ADE80]/50"
                      : "bg-white text-gray-400 border-gray-200 hover:border-black hover:text-black"
                }`}
                data-testid={`button-period-${p}`}
              >
                {p === "all" ? "All Time" : p === "weekly" ? "Weekly" : "Daily"}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className={`animate-spin w-10 h-10 border-4 rounded-full ${privateMode ? "border-[#4ADE80] border-t-transparent" : "border-black border-t-transparent"}`} />
              <span className={`text-sm font-bold ${privateMode ? "text-[#4ADE80]/50 font-mono" : "text-gray-400"}`}>
                {privateMode ? "LOADING..." : "Loading rankings..."}
              </span>
            </div>
          ) : top3.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-end gap-3 px-2">
                {top3.map((entry, i) => (
                  <PodiumCard
                    key={entry.walletAddress}
                    entry={entry}
                    rank={i + 1}
                    isYou={entry.walletAddress === connectedWallet}
                    privateMode={privateMode}
                  />
                ))}
              </div>

              {rest.length > 0 && (
                <div className={`rounded-2xl overflow-hidden ${
                  privateMode
                    ? "border border-[#4ADE80]/20 bg-zinc-900/50"
                    : "border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                }`}>
                  {rest.map((entry, i) => {
                    const rank = i + 4;
                    const isYou = entry.walletAddress === connectedWallet;
                    const tierColor = TIER_COLORS[entry.tier] || TIER_COLORS.pill_popper;
                    return (
                      <motion.div
                        key={entry.walletAddress}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-center gap-3 px-4 py-3.5 ${
                          i > 0 ? (privateMode ? "border-t border-[#4ADE80]/10" : "border-t border-gray-100") : ""
                        } ${
                          isYou
                            ? privateMode ? "bg-[#4ADE80]/5" : "bg-yellow-50"
                            : privateMode ? "hover:bg-[#4ADE80]/5" : "hover:bg-gray-50"
                        } transition-colors`}
                        data-testid={`leaderboard-entry-${rank}`}
                      >
                        <span className={`w-8 text-center text-sm font-black ${
                          privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-400"
                        }`}>
                          {rank}
                        </span>

                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          privateMode
                            ? "bg-zinc-800 border border-[#4ADE80]/20"
                            : "bg-gray-100 border-2 border-black"
                        }`}>
                          <span className={`text-xs font-black ${privateMode ? "text-white" : "text-black"}`}>
                            {entry.walletAddress.slice(0, 2)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <Link href={`/user/${entry.walletAddress}`}>
                            <span className={`font-mono text-sm font-bold cursor-pointer hover:underline block ${
                              isYou ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : (privateMode ? "text-white" : "text-black")
                            }`}>
                              {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                              {isYou && <span className="ml-1.5 text-[10px] opacity-60">(you)</span>}
                            </span>
                          </Link>
                          <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: tierColor }}>
                            {TIER_ICONS[entry.tier]}
                            {TIER_LABELS[entry.tier] || entry.tier}
                          </span>
                        </div>

                        {entry.ogNftMint && (
                          <span className="text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full flex-shrink-0">
                            1.5x
                          </span>
                        )}

                        <div className="text-right flex-shrink-0">
                          <span className={`text-sm font-black font-mono ${
                            isYou ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : (privateMode ? "text-white" : "text-black")
                          }`}>
                            {getPoints(entry).toLocaleString()}
                          </span>
                          <span className={`block text-[9px] font-bold uppercase ${privateMode ? "text-white/30" : "text-gray-400"}`}>
                            pts
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {currentUserEntry && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl overflow-hidden ${
                    privateMode
                      ? "border border-[#4ADE80]/30 bg-[#4ADE80]/5"
                      : "border-2 border-red-300 bg-red-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <div className={`px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest ${
                    privateMode ? "text-[#4ADE80]/40 bg-[#4ADE80]/5" : "text-red-400 bg-red-100/50"
                  }`}>
                    Your Position
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`w-8 text-center text-sm font-black ${
                      privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-400"
                    }`}>
                      —
                    </span>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      privateMode
                        ? "bg-[#4ADE80]/10 border border-[#4ADE80]/30"
                        : "bg-red-100 border-2 border-red-300"
                    }`}>
                      <span className={`text-xs font-black ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>
                        {currentUserEntry.walletAddress.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/user/${currentUserEntry.walletAddress}`}>
                        <span className={`font-mono text-sm font-bold cursor-pointer hover:underline block ${
                          privateMode ? "text-[#4ADE80]" : "text-red-500"
                        }`}>
                          {currentUserEntry.walletAddress.slice(0, 6)}...{currentUserEntry.walletAddress.slice(-4)}
                          <span className="ml-1.5 text-[10px] opacity-60">(you)</span>
                        </span>
                      </Link>
                      <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: TIER_COLORS[currentUserEntry.tier] || TIER_COLORS.pill_popper }}>
                        {TIER_ICONS[currentUserEntry.tier]}
                        {TIER_LABELS[currentUserEntry.tier] || currentUserEntry.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronUp className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]/40" : "text-gray-300"}`} />
                      <div className="text-right">
                        <span className={`text-sm font-black font-mono ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>
                          {currentUserEntry.totalPoints.toLocaleString()}
                        </span>
                        <span className={`block text-[9px] font-bold uppercase ${privateMode ? "text-white/30" : "text-gray-400"}`}>
                          pts
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-2xl p-16 text-center ${
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
        </motion.div>
      </div>
    </Layout>
  );
}
