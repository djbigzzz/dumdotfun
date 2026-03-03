import { Layout } from "@/components/layout";
import { usePrivacy } from "@/lib/privacy-context";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useState } from "react";
import { Trophy, Crown, Star, ArrowLeft, Zap, Diamond, Shield, Flame, TrendingUp } from "lucide-react";

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

  const isCurrentUserInList = entries?.some(e => e.walletAddress === connectedWallet);
  const currentUserEntry: LeaderboardEntry | null = (!isCurrentUserInList && connectedWallet && currentUserPoints) ? {
    walletAddress: connectedWallet,
    totalPoints: currentUserPoints.totalPoints || 0,
    tier: currentUserPoints.tier || "pill_popper",
    ogNftMint: currentUserPoints.ogNftMint || null,
  } : null;

  const cardStyle = privateMode
    ? "border-2 border-[#4ADE80]/50 bg-zinc-900/50 rounded-xl"
    : "border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const getRankDisplay = (index: number) => {
    if (index === 0) return { emoji: "1st", bg: privateMode ? "bg-yellow-500/20" : "bg-yellow-300" };
    if (index === 1) return { emoji: "2nd", bg: privateMode ? "bg-gray-400/20" : "bg-gray-200" };
    if (index === 2) return { emoji: "3rd", bg: privateMode ? "bg-amber-700/20" : "bg-amber-200" };
    return { emoji: `${index + 1}`, bg: "" };
  };

  return (
    <Layout>
      <div className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl mx-auto px-4"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Link href="/profile">
                <span className={`cursor-pointer ${privateMode ? "text-[#4ADE80]" : "text-gray-600"} hover:opacity-70`}>
                  <ArrowLeft className="w-5 h-5" />
                </span>
              </Link>
              <div>
                <h1 className={`text-3xl font-black ${privateMode ? "text-white font-mono" : "text-black"}`}>
                  {privateMode ? "> LEADERBOARD" : "Leaderboard"}
                </h1>
                <p className={`text-sm ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                  {privateMode ? "// TOP_AGENTS_BY_POINTS" : "Top users ranked by points"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {(["all", "weekly", "daily"] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm font-black uppercase rounded-lg border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    period === p
                      ? privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-black text-white"
                      : privateMode ? "bg-black text-[#4ADE80]/60 border-[#4ADE80]/30 hover:border-[#4ADE80]" : "bg-white text-gray-500 hover:border-black"
                  }`}
                  data-testid={`button-period-${p}`}
                >
                  {p === "all" ? "All Time" : p === "weekly" ? "This Week" : "Today"}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className={`animate-spin w-8 h-8 border-4 rounded-full ${privateMode ? "border-[#4ADE80] border-t-transparent" : "border-black border-t-transparent"}`} />
              </div>
            ) : entries && entries.length > 0 ? (
              <div className={`${cardStyle} overflow-hidden`}>
                <div className={`grid grid-cols-12 gap-2 px-4 py-3 text-xs font-black uppercase ${privateMode ? "text-[#4ADE80]/40 bg-black/50 font-mono" : "text-gray-500 bg-gray-50"}`}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Wallet</div>
                  <div className="col-span-2 text-center">Tier</div>
                  <div className="col-span-2 text-center">OG</div>
                  <div className="col-span-2 text-right">Points</div>
                </div>
                {entries.map((entry, i) => {
                  const rank = getRankDisplay(i);
                  const isYou = entry.walletAddress === connectedWallet;
                  const tierColor = TIER_COLORS[entry.tier] || TIER_COLORS.pill_popper;
                  return (
                    <motion.div
                      key={entry.walletAddress}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-t transition-colors ${
                        isYou
                          ? privateMode ? "bg-[#4ADE80]/10 border-[#4ADE80]/30" : "bg-yellow-50 border-yellow-200"
                          : privateMode ? "border-[#4ADE80]/10 hover:bg-[#4ADE80]/5" : "border-gray-100 hover:bg-gray-50"
                      }`}
                      data-testid={`leaderboard-entry-${i}`}
                    >
                      <div className="col-span-1">
                        <span className={`text-sm font-black ${
                          i < 3 ? "text-lg" : privateMode ? "text-[#4ADE80]/60" : "text-gray-500"
                        }`} style={i < 3 ? { color: tierColor } : {}}>
                          {rank.emoji}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <Link href={`/user/${entry.walletAddress}`}>
                          <span className={`font-mono text-sm font-bold cursor-pointer hover:underline ${
                            isYou
                              ? privateMode ? "text-[#4ADE80]" : "text-red-500"
                              : privateMode ? "text-white" : "text-black"
                          }`}>
                            {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                            {isYou && <span className="ml-1 text-xs opacity-60">(you)</span>}
                          </span>
                        </Link>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black" style={{ color: tierColor }}>
                          {TIER_ICONS[entry.tier]}
                          {TIER_LABELS[entry.tier] || entry.tier}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        {entry.ogNftMint ? (
                          <span className="text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                            1.5x
                          </span>
                        ) : (
                          <span className={`text-xs ${privateMode ? "text-[#4ADE80]/20" : "text-gray-300"}`}>-</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className={`text-sm font-black font-mono ${
                          isYou ? (privateMode ? "text-[#4ADE80]" : "text-red-500") : (privateMode ? "text-white" : "text-black")
                        }`}>
                          {(period !== "all" && entry.periodPoints !== undefined ? entry.periodPoints : entry.totalPoints).toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                {currentUserEntry && (
                  <>
                    <div className={`px-4 py-1 text-center text-xs font-mono ${privateMode ? "text-[#4ADE80]/30 bg-black/30" : "text-gray-400 bg-gray-50"}`}>
                      ··· your position ···
                    </div>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-t ${
                        privateMode ? "bg-[#4ADE80]/10 border-[#4ADE80]/30" : "bg-yellow-50 border-yellow-200"
                      }`}
                      data-testid="leaderboard-entry-current-user"
                    >
                      <div className="col-span-1">
                        <span className={`text-sm font-black ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                          50+
                        </span>
                      </div>
                      <div className="col-span-5">
                        <Link href={`/user/${currentUserEntry.walletAddress}`}>
                          <span className={`font-mono text-sm font-bold cursor-pointer hover:underline ${
                            privateMode ? "text-[#4ADE80]" : "text-red-500"
                          }`}>
                            {currentUserEntry.walletAddress.slice(0, 6)}...{currentUserEntry.walletAddress.slice(-4)}
                            <span className="ml-1 text-xs opacity-60">(you)</span>
                          </span>
                        </Link>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-black" style={{ color: TIER_COLORS[currentUserEntry.tier] || TIER_COLORS.pill_popper }}>
                          {TIER_ICONS[currentUserEntry.tier]}
                          {TIER_LABELS[currentUserEntry.tier] || currentUserEntry.tier}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        {currentUserEntry.ogNftMint ? (
                          <span className="text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                            1.5x
                          </span>
                        ) : (
                          <span className={`text-xs ${privateMode ? "text-[#4ADE80]/20" : "text-gray-300"}`}>-</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className={`text-sm font-black font-mono ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>
                          {currentUserEntry.totalPoints.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
            ) : (
              <div className={`${cardStyle} p-12 text-center`}>
                <Trophy className={`w-12 h-12 mx-auto mb-4 ${privateMode ? "text-[#4ADE80]/30" : "text-gray-300"}`} />
                <p className={`text-lg font-bold mb-2 ${privateMode ? "text-white" : "text-black"}`}>
                  No rankings yet
                </p>
                <p className={`text-sm ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                  Be the first to earn points by completing quests!
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
