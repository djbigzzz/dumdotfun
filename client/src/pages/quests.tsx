import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivacy } from "@/lib/privacy-context";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import {
  Wallet, Calendar, Gift, Trophy, Star, Flame, Shield, Diamond,
  Award, Target, TrendingUp, ChevronRight, Lock, Zap, Check,
  CalendarCheck
} from "lucide-react";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "sonner";

interface QuestDef {
  action: string;
  points: number;
  completed: boolean;
  repeatable: boolean;
  category: string;
  title: string;
  description: string;
}

interface PointsData {
  totalPoints: number;
  tier: string;
  tierLabel: string;
  nextTier: { name: string; label: string; minPoints: number } | null;
  ogNftMint: string | null;
  hasOgCard: boolean;
  ogBoost: string;
  lastDailyLogin: string | null;
  streak: number;
  dailyCheckedIn: boolean;
  completedQuests: string[];
  questDefinitions: QuestDef[];
  history: { action: string; points: number; createdAt: string; referralSource: string | null }[];
  rank: number;
}

const TIER_CONFIG = [
  { key: "pill_popper", label: "Pill Popper", min: 0, max: 499, color: "#EC4899", icon: <Star className="w-5 h-5" />, bg: "bg-pink-500", border: "border-pink-500" },
  { key: "bonding_curve", label: "Bonding Curve", min: 500, max: 1999, color: "#3B82F6", icon: <TrendingUp className="w-5 h-5" />, bg: "bg-blue-500", border: "border-blue-500" },
  { key: "degen", label: "Degen", min: 2000, max: 4999, color: "#EAB308", icon: <Flame className="w-5 h-5" />, bg: "bg-yellow-500", border: "border-yellow-500" },
  { key: "rug_proof", label: "Rug Proof", min: 5000, max: 9999, color: "#22C55E", icon: <Shield className="w-5 h-5" />, bg: "bg-green-500", border: "border-green-500" },
  { key: "solana_god", label: "Solana God", min: 10000, max: Infinity, color: "#06B6D4", icon: <Diamond className="w-5 h-5" />, bg: "bg-cyan-500", border: "border-cyan-400" },
];

const QUEST_ICONS: Record<string, React.ReactNode> = {
  connect_wallet: <Wallet className="w-5 h-5" />,
  first_trade: <TrendingUp className="w-5 h-5" />,
  first_bet: <Target className="w-5 h-5" />,
  first_token: <Star className="w-5 h-5" />,
  first_market: <Award className="w-5 h-5" />,
  first_win: <Trophy className="w-5 h-5" />,
  daily_login: <Calendar className="w-5 h-5" />,
  streak_7: <Flame className="w-5 h-5" />,
  streak_30: <Flame className="w-5 h-5" />,
  mint_og_nft: <Gift className="w-5 h-5" />,
};

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  onboarding: { label: "Onboarding", color: "#3B82F6", icon: <Wallet className="w-4 h-4" /> },
  activity: { label: "Activity", color: "#EAB308", icon: <Zap className="w-4 h-4" /> },
  streaks: { label: "Streaks", color: "#F97316", icon: <Flame className="w-4 h-4" /> },
  special: { label: "Special", color: "#A855F7", icon: <Diamond className="w-4 h-4" /> },
};

export default function QuestsPage() {
  const { privateMode } = usePrivacy();
  const { connectedWallet, connectWallet } = useWallet();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const { data: pointsData } = useQuery<PointsData>({
    queryKey: ["points", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/points/${connectedWallet}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!connectedWallet,
    refetchInterval: 30000,
  });

  const ogClaimMutation = useMutation({
    mutationFn: async () => {
      const infoRes = await fetch("/api/points/og-card-info");
      if (!infoRes.ok) throw new Error("Failed to fetch OG Card info");
      const { priceSol, platformWallet } = await infoRes.json();

      if (!window.solana?.isPhantom) throw new Error("Phantom wallet not found");

      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const fromPubkey = new PublicKey(connectedWallet!);
      const toPubkey = new PublicKey(platformWallet);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: Math.round(priceSol * LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const { signature } = await window.solana.signAndSendTransaction(transaction);
      toast.info("Transaction sent! Verifying on-chain...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      const verifyRes = await fetch("/api/points/claim-og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet, txSignature: signature }),
      });

      const result = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(result.message || "Verification failed");
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || "OG Card minted!");
      queryClient.invalidateQueries({ queryKey: ["points", connectedWallet] });
    },
    onError: (error: Error) => {
      if (error.message.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(error.message || "Failed to mint OG Card");
      }
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!connectedWallet || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/points/daily-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet }),
      });
      const data = await res.json();
      if (data.awarded) {
        setClaimed(true);
        toast.success(`+${data.points} pts! ${data.streak} day streak`);
        queryClient.invalidateQueries({ queryKey: ["points", connectedWallet] });
      } else {
        toast.info("Already checked in today!");
      }
    } catch {
      toast.error("Check-in failed");
    } finally {
      setClaiming(false);
    }
  };

  const alreadyCheckedIn = (() => {
    if (!pointsData?.lastDailyLogin) return false;
    const last = new Date(pointsData.lastDailyLogin);
    const now = new Date();
    return last.getUTCFullYear() === now.getUTCFullYear() &&
      last.getUTCMonth() === now.getUTCMonth() &&
      last.getUTCDate() === now.getUTCDate();
  })();

  const isConnected = !!connectedWallet;
  const quests = pointsData?.questDefinitions || [];
  const totalPoints = pointsData?.totalPoints || 0;
  const currentTierKey = pointsData?.tier || "pill_popper";
  const streak = pointsData?.streak || 0;
  const hasOg = !!pointsData?.hasOgCard;
  const completedCount = quests.filter(q => q.completed).length;
  const totalQuests = quests.filter(q => !q.repeatable).length;

  const groupedQuests = quests.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, QuestDef[]>);

  const cardStyle = privateMode
    ? "border-2 border-[#4ADE80]/50 bg-zinc-900/50 rounded-xl shadow-[4px_4px_0px_0px_rgba(74,222,128,0.3)]"
    : "border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const headingColor = privateMode ? "text-[#4ADE80]" : "text-zinc-900";
  const subColor = privateMode ? "text-[#4ADE80]/70" : "text-gray-500";

  return (
    <Layout>
      <div className="min-h-[calc(100vh-120px)] py-8 md:py-12">
        <div className="max-w-4xl mx-auto px-4 space-y-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <h1 className={`text-3xl md:text-5xl font-black tracking-tight ${headingColor}`} data-testid="text-quests-title">
              {privateMode ? "> QUESTS_" : "Quests & Rewards"}
            </h1>
            <p className={`text-base md:text-lg max-w-xl mx-auto ${subColor}`}>
              Complete quests, earn points, climb the ranks. Earn up to 2,060+ points across 10 quests.
            </p>
          </motion.div>

          {!isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={privateMode
                ? "border-2 border-[#4ADE80] bg-[#4ADE80]/10 rounded-xl p-6 text-center"
                : "border-2 border-black bg-yellow-50 rounded-xl p-6 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }
              data-testid="banner-connect-prompt"
            >
              <Lock className={`w-8 h-8 mx-auto mb-3 ${privateMode ? "text-[#4ADE80]" : "text-yellow-600"}`} />
              <p className={`font-black text-lg mb-2 ${privateMode ? "text-[#4ADE80]" : "text-zinc-900"}`}>
                Connect your wallet to start earning
              </p>
              <p className={`text-sm mb-4 ${subColor}`}>
                Track progress, complete quests, and unlock rewards
              </p>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                onClick={handleConnect}
                disabled={isConnecting}
                className={privateMode
                  ? "px-6 py-3 bg-[#4ADE80] text-black font-black rounded-lg border-2 border-[#4ADE80] hover:bg-[#4ADE80]/90"
                  : "px-6 py-3 bg-red-500 text-white font-black rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                }
                data-testid="button-connect-quests"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </motion.button>
            </motion.div>
          )}

          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`${cardStyle} p-5`}
              data-testid="card-points-summary"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    TIER_CONFIG.find(t => t.key === currentTierKey)?.bg || "bg-pink-500"
                  }`} style={{ color: "white" }}>
                    {TIER_CONFIG.find(t => t.key === currentTierKey)?.icon}
                  </div>
                  <div>
                    <p className={`text-2xl font-black ${headingColor}`} data-testid="text-total-points">
                      {totalPoints.toLocaleString()} pts
                    </p>
                    <p className={`text-sm font-bold ${subColor}`}>
                      {TIER_CONFIG.find(t => t.key === currentTierKey)?.label || "Pill Popper"}
                      {hasOg && <span className="ml-2 text-purple-500">+50% OG Boost</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {streak > 0 && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                      privateMode ? "bg-orange-500/20 border border-orange-500/50" : "bg-orange-50 border-2 border-black"
                    }`}>
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className={`font-black text-sm ${privateMode ? "text-orange-400" : "text-orange-600"}`}>{streak}d streak</span>
                    </div>
                  )}
                  <div className={`px-3 py-1.5 rounded-lg ${
                    privateMode ? "bg-zinc-800 border border-[#4ADE80]/30" : "bg-gray-100 border-2 border-black"
                  }`}>
                    <span className={`font-bold text-sm ${subColor}`}>{completedCount}/{totalQuests} done</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {isConnected && !alreadyCheckedIn && !claimed && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={handleCheckIn}
              disabled={claiming}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3 disabled:opacity-70"
              data-testid="button-daily-checkin-quests"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <CalendarCheck className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-black font-black text-sm">Daily Check-in</p>
                  <p className="text-black/60 text-xs font-medium">{claiming ? "Claiming..." : "Tap to claim +10 pts"}</p>
                </div>
              </div>
              <div className="bg-white border-2 border-black rounded-lg px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-green-600 font-black text-sm">+10</span>
              </div>
            </motion.button>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-4"
          >
            <h2 className={`text-xl font-black ${headingColor}`}>
              {privateMode ? "> TIER_LADDER" : "Tier Ladder"}
            </h2>
            <div className={`${cardStyle} p-5 overflow-hidden`} data-testid="card-tier-ladder">
              <div className="space-y-3">
                {TIER_CONFIG.map((tier, i) => {
                  const isCurrent = currentTierKey === tier.key;
                  const isUnlocked = isConnected && totalPoints >= tier.min;
                  return (
                    <div
                      key={tier.key}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isCurrent
                          ? privateMode
                            ? "bg-[#4ADE80]/10 border border-[#4ADE80]/50"
                            : "bg-gray-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          : isUnlocked
                            ? privateMode ? "opacity-60" : "opacity-60"
                            : privateMode ? "opacity-40" : "opacity-40"
                      }`}
                      data-testid={`tier-${tier.key}`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: tier.color + "20", color: tier.color }}
                      >
                        {tier.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${privateMode ? "text-white" : "text-zinc-900"}`}>
                            {tier.label}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: tier.color + "30", color: tier.color }}>
                              Current
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${subColor}`}>
                          {tier.max === Infinity ? `${tier.min.toLocaleString()}+ pts` : `${tier.min.toLocaleString()} - ${tier.max.toLocaleString()} pts`}
                        </p>
                      </div>
                      {isUnlocked ? (
                        <Check className="w-5 h-5 flex-shrink-0" style={{ color: tier.color }} />
                      ) : (
                        <Lock className={`w-4 h-4 flex-shrink-0 ${subColor}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h2 className={`text-xl font-black ${headingColor}`}>
              {privateMode ? "> ALL_QUESTS" : "All Quests"}
            </h2>

            {Object.entries(CATEGORY_LABELS).map(([catKey, cat]) => {
              const catQuests = isConnected ? (groupedQuests[catKey] || []) : getDefaultQuests(catKey);
              if (catQuests.length === 0) return null;
              return (
                <div key={catKey} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${privateMode ? "text-white/70" : "text-gray-600"}`}>
                      {cat.label}
                    </h3>
                  </div>
                  <div className="grid gap-3">
                    {catQuests.map((quest) => (
                      <div
                        key={quest.action}
                        className={`${cardStyle} p-4 flex items-center gap-4 ${quest.completed ? "opacity-60" : ""}`}
                        data-testid={`quest-${quest.action}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            quest.completed
                              ? privateMode ? "bg-[#4ADE80]/20" : "bg-green-100"
                              : privateMode ? "bg-zinc-800" : "bg-gray-100"
                          }`}
                          style={{ color: quest.completed ? (privateMode ? "#4ADE80" : "#22C55E") : cat.color }}
                        >
                          {quest.completed ? <Check className="w-5 h-5" /> : (QUEST_ICONS[quest.action] || <Star className="w-5 h-5" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${privateMode ? "text-white" : "text-zinc-900"}`}>
                            {quest.title}
                          </p>
                          <p className={`text-xs ${subColor}`}>{quest.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg flex-shrink-0 ${
                          quest.completed
                            ? privateMode ? "bg-[#4ADE80]/20" : "bg-green-100"
                            : privateMode ? "bg-zinc-800 border border-zinc-700" : "bg-gray-100 border-2 border-black"
                        }`}>
                          <span className={`font-black text-sm ${
                            quest.completed
                              ? privateMode ? "text-[#4ADE80]" : "text-green-600"
                              : privateMode ? "text-white" : "text-zinc-900"
                          }`}>
                            {quest.completed ? "Done" : `+${quest.points}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-4"
          >
            <h2 className={`text-xl font-black ${headingColor}`}>
              {privateMode ? "> OG_CARD" : "OG Card"}
            </h2>
            <div className={`${cardStyle} p-6`} data-testid="card-og-mint">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <Diamond className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className={`font-black text-lg ${headingColor}`}>DUM OG Card</p>
                  <p className={`text-sm ${subColor}`}>
                    Permanent 1.5x points multiplier on everything you earn. Genesis holders get exclusive perks.
                    More benefits coming soon.
                  </p>
                  <p className={`text-xs font-bold ${privateMode ? "text-purple-400" : "text-purple-600"}`}>
                    0.2 SOL on Solana Mainnet
                  </p>
                </div>
                {isConnected ? (
                  hasOg ? (
                    <div className={`px-4 py-2 rounded-lg font-black text-sm ${
                      privateMode ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/50" : "bg-green-100 text-green-700 border-2 border-black"
                    }`} data-testid="badge-og-active">
                      Active +50%
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                      onClick={() => ogClaimMutation.mutate()}
                      disabled={ogClaimMutation.isPending}
                      className={`px-5 py-2.5 font-black text-sm rounded-lg flex-shrink-0 ${
                        privateMode
                          ? "bg-purple-600 text-white border border-purple-400 hover:bg-purple-500"
                          : "bg-purple-600 text-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      } disabled:opacity-50`}
                      data-testid="button-mint-og"
                    >
                      {ogClaimMutation.isPending ? "Minting..." : "Mint for 0.2 SOL"}
                    </motion.button>
                  )
                ) : (
                  <div className={`px-4 py-2 rounded-lg text-sm font-bold ${subColor}`}>
                    Connect wallet to mint
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {isConnected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center pb-8"
            >
              <Link href="/profile">
                <span className={`inline-flex items-center gap-2 font-bold text-sm cursor-pointer hover:underline ${
                  privateMode ? "text-[#4ADE80]" : "text-red-500"
                }`} data-testid="link-view-profile">
                  View full profile <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function getDefaultQuests(category: string): QuestDef[] {
  const defaults: Record<string, QuestDef[]> = {
    onboarding: [
      { action: "connect_wallet", points: 50, completed: false, repeatable: false, category: "onboarding", title: "Connect Wallet", description: "Connect your Phantom wallet to get started" },
      { action: "first_trade", points: 100, completed: false, repeatable: false, category: "onboarding", title: "First Trade", description: "Buy or sell any token on the platform" },
      { action: "first_bet", points: 100, completed: false, repeatable: false, category: "onboarding", title: "First Bet", description: "Place your first prediction market bet" },
    ],
    activity: [
      { action: "first_token", points: 500, completed: false, repeatable: false, category: "activity", title: "Launch a Token", description: "Create and launch your first meme token" },
      { action: "first_market", points: 300, completed: false, repeatable: false, category: "activity", title: "Create a Market", description: "Create a prediction market for any token" },
      { action: "first_win", points: 200, completed: false, repeatable: false, category: "activity", title: "Win a Bet", description: "Win your first prediction market bet" },
    ],
    streaks: [
      { action: "daily_login", points: 10, completed: false, repeatable: true, category: "streaks", title: "Daily Check-in", description: "Check in every day to earn points" },
      { action: "streak_7", points: 150, completed: false, repeatable: false, category: "streaks", title: "7-Day Streak", description: "Check in for 7 consecutive days" },
      { action: "streak_30", points: 600, completed: false, repeatable: false, category: "streaks", title: "30-Day Streak", description: "Check in for 30 consecutive days" },
    ],
    special: [
      { action: "mint_og_nft", points: 50, completed: false, repeatable: false, category: "special", title: "Mint OG Card", description: "Mint the DUM OG Card for permanent 1.5x boost" },
    ],
  };
  return defaults[category] || [];
}
