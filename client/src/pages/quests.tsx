import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  Wallet, Calendar, Gift, Trophy, Star, Flame, Shield, Diamond,
  Award, Target, TrendingUp, Lock, Zap, Check,
  CalendarCheck, Sparkles, ExternalLink, ChevronRight, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

interface QuestDef {
  action: string;
  points: number;
  completed: boolean;
  repeatable: boolean;
  category: string;
  title: string;
  description: string;
  canClaim?: boolean;
}

interface PointsData {
  totalPoints: number;
  tier: string;
  tierLabel: string;
  nextTier: { name: string; label: string; minPoints: number } | null;
  ogNftMint: string | null;
  hasOgCard: boolean;
  ogBoost: string;
  ogMultiplier: number;
  totalBonusPoints: number;
  lastDailyLogin: string | null;
  streak: number;
  dailyCheckedIn: boolean;
  completedQuests: string[];
  questDefinitions: QuestDef[];
  history: { action: string; points: number; createdAt: string; referralSource: string | null }[];
  rank: number;
}

const TIERS = [
  { key: "pill_popper",    label: "Fresh Pill",    min: 0,     max: 499,      color: "#EC4899", bg: "from-pink-500/20 to-pink-600/5",    icon: <Star className="w-4 h-4" />,      emoji: "💊" },
  { key: "bonding_curve", label: "Curve Rider",   min: 500,   max: 1999,     color: "#3B82F6", bg: "from-blue-500/20 to-blue-600/5",    icon: <TrendingUp className="w-4 h-4" />, emoji: "📈" },
  { key: "degen",          label: "Full Degen",    min: 2000,  max: 4999,     color: "#EAB308", bg: "from-yellow-500/20 to-yellow-600/5",icon: <Flame className="w-4 h-4" />,      emoji: "🔥" },
  { key: "rug_proof",      label: "Diamond Hands", min: 5000,  max: 9999,     color: "#22C55E", bg: "from-green-500/20 to-green-600/5",  icon: <Shield className="w-4 h-4" />,     emoji: "💎" },
  { key: "solana_god",     label: "On-Chain God",  min: 10000, max: Infinity, color: "#06B6D4", bg: "from-cyan-500/20 to-cyan-600/5",    icon: <Diamond className="w-4 h-4" />,    emoji: "👑" },
];

const QUEST_ICONS: Record<string, React.ReactNode> = {
  connect_wallet: <Wallet className="w-5 h-5" />,
  first_trade:    <TrendingUp className="w-5 h-5" />,
  first_bet:      <Target className="w-5 h-5" />,
  first_token:    <Star className="w-5 h-5" />,
  first_market:   <Award className="w-5 h-5" />,
  first_win:      <Trophy className="w-5 h-5" />,
  daily_login:    <Calendar className="w-5 h-5" />,
  streak_7:       <Flame className="w-5 h-5" />,
  streak_30:      <Flame className="w-5 h-5" />,
  mint_og_nft:    <Gift className="w-5 h-5" />,
};

const CAT_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  onboarding: { label: "Onboarding",  color: "#3B82F6", bg: "bg-blue-500",   emoji: "🚀" },
  activity:   { label: "Activity",    color: "#EAB308", bg: "bg-yellow-500", emoji: "⚡" },
  streaks:    { label: "Streaks",     color: "#F97316", bg: "bg-orange-500", emoji: "🔥" },
  special:    { label: "Special",     color: "#A855F7", bg: "bg-purple-500", emoji: "✨" },
};

const QUEST_ACTIONS: Record<string, { label: string; href: string }> = {
  first_trade:  { label: "Trade now",   href: "/tokens" },
  first_bet:    { label: "Bet now",     href: "/predictions" },
  first_token:  { label: "Create now",  href: "/create" },
  first_win:    { label: "View tokens", href: "/tokens" },
  first_market: { label: "Create market", href: "/create-market" },
};

function getDefaultQuests(category: string): QuestDef[] {
  const defaults: Record<string, QuestDef[]> = {
    onboarding: [
      { action: "connect_wallet", points: 50,  completed: false, repeatable: false, category: "onboarding", title: "Connect Wallet",  description: "Connect your wallet to get started" },
      { action: "first_trade",    points: 100, completed: false, repeatable: false, category: "onboarding", title: "First Trade",     description: "Buy or sell any token" },
      { action: "first_bet",      points: 100, completed: false, repeatable: false, category: "onboarding", title: "First Bet",       description: "Place a prediction market bet" },
    ],
    activity: [
      { action: "first_token",  points: 500, completed: false, repeatable: false, category: "activity", title: "Launch a Token",  description: "Create your first meme token" },
      { action: "first_market", points: 300, completed: false, repeatable: false, category: "activity", title: "Create a Market", description: "Create a prediction market" },
      { action: "first_win",    points: 200, completed: false, repeatable: false, category: "activity", title: "Win a Bet",       description: "Win a prediction market bet" },
    ],
    streaks: [
      { action: "daily_login", points: 10,  completed: false, repeatable: true,  category: "streaks", title: "Daily Check-in", description: "Check in daily for points" },
      { action: "streak_7",    points: 150, completed: false, repeatable: false, category: "streaks", title: "7-Day Streak",   description: "7 consecutive daily check-ins" },
      { action: "streak_30",   points: 600, completed: false, repeatable: false, category: "streaks", title: "30-Day Streak",  description: "30 consecutive daily check-ins" },
    ],
    special: [
      { action: "mint_og_nft", points: 500, completed: false, repeatable: false, category: "special", title: "Claim OG Card", description: "Get the free 1.2x points multiplier" },
    ],
  };
  return defaults[category] || [];
}

export default function QuestsPage() {
  usePageTitle("/quests");
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
      const res = await fetch("/api/points/claim-og", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to activate OG Card");
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || "OG Card activated!");
      queryClient.invalidateQueries({ queryKey: ["points", connectedWallet] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to activate OG Card");
    },
  });

  const claimQuestMutation = useMutation({
    mutationFn: async (questAction: string) => {
      const res = await fetch("/api/points/claim-quest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet, questAction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim");
      return data;
    },
    onSuccess: (data) => {
      if (data.awarded) {
        toast.success(`+${data.points} pts claimed!`);
        queryClient.invalidateQueries({ queryKey: ["points", connectedWallet] });
      } else {
        toast.info("Already claimed or not eligible");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Claim failed");
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try { await connectWallet(); } finally { setIsConnecting(false); }
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
        toast.success(`+${data.points} pts! ${data.streak} day streak 🔥`);
        queryClient.invalidateQueries({ queryKey: ["points", connectedWallet] });
      } else {
        toast.info("Already checked in today!");
      }
    } catch { toast.error("Check-in failed"); }
    finally { setClaiming(false); }
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
  const totalQuests = quests.length;

  const groupedQuests = quests.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, QuestDef[]>);

  const currentTierIdx = TIERS.findIndex(t => t.key === currentTierKey);
  const currentTier = TIERS[currentTierIdx] || TIERS[0];
  const nextTier = TIERS[currentTierIdx + 1];
  const progressPct = nextTier
    ? Math.min(100, ((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100;

  return (
    <Layout>
      <div className="pb-12">

        {/* Hero Banner */}
        <div className="bg-gradient-to-br from-red-500 via-red-600 to-orange-600 border-b-4 border-black">
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-6 h-6 text-yellow-300" />
                  <span className="text-yellow-300 font-black text-sm uppercase tracking-wider">Earn • Climb • Dominate</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white" data-testid="text-quests-title">
                  Quests & Rewards
                </h1>
                <p className="text-red-100 text-sm mt-1">Complete quests, earn points, and climb the ranks.</p>
              </div>

              {isConnected ? (
                <div className="flex gap-3">
                  <div className="bg-white/15 backdrop-blur rounded-xl border-2 border-white/30 px-5 py-3 text-center min-w-[90px]">
                    <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">Points</p>
                    <p className="text-white text-2xl font-black" data-testid="text-total-points">{totalPoints.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/15 backdrop-blur rounded-xl border-2 border-white/30 px-5 py-3 text-center min-w-[90px]">
                    <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">Streak</p>
                    <p className="text-white text-2xl font-black flex items-center justify-center gap-1">
                      {streak > 0 ? <><Flame className="w-5 h-5 text-yellow-300" />{streak}d</> : "—"}
                    </p>
                  </div>
                  <div className="bg-white/15 backdrop-blur rounded-xl border-2 border-white/30 px-5 py-3 text-center min-w-[90px]">
                    <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">Done</p>
                    <p className="text-white text-2xl font-black">{completedCount}<span className="text-white/50 text-base">/{totalQuests}</span></p>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex items-center gap-2 bg-white text-red-600 font-black px-6 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.4)] transition-all disabled:opacity-70"
                  data-testid="button-connect-quests"
                >
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? "Connecting..." : "Connect Wallet to Start"}
                </motion.button>
              )}
            </div>

            {/* Progress bar (when connected) */}
            {isConnected && nextTier && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/80 text-xs font-bold flex items-center gap-1.5">
                    <span>{currentTier.emoji}</span> {currentTier.label}
                  </span>
                  <span className="text-white/80 text-xs font-bold flex items-center gap-1.5">
                    {nextTier.emoji} {nextTier.label}
                    <span className="text-white/50">({(nextTier.min - totalPoints).toLocaleString()} pts away)</span>
                  </span>
                </div>
                <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-white/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500"
                  />
                </div>
              </div>
            )}
            {isConnected && !nextTier && (
              <div className="mt-5 flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 border border-white/30 w-fit">
                <Trophy className="w-4 h-4 text-yellow-300" />
                <span className="text-white font-black text-sm">Max tier reached — On-Chain God 👑</span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

          {/* Daily Check-in (connected only) */}
          {isConnected && (
            <AnimatePresence mode="wait">
              {alreadyCheckedIn || claimed ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-green-500 bg-green-50 rounded-xl p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(34,197,94,0.3)]"
                  data-testid="card-checkin-done"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 border-2 border-green-400 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-black text-green-800">Checked in today!</p>
                      {streak > 0 && <p className="text-green-600 text-xs font-bold">🔥 {streak} day streak — come back tomorrow</p>}
                    </div>
                  </div>
                  <div className="text-green-400">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="checkin"
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  onClick={handleCheckIn}
                  disabled={claiming}
                  className="w-full border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 flex items-center justify-between disabled:opacity-70"
                  data-testid="button-daily-checkin-quests"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/20 border-2 border-black/20 flex items-center justify-center">
                      <CalendarCheck className="w-5 h-5 text-black" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-black text-base">{claiming ? "Claiming..." : "Daily Check-in"}</p>
                      {streak > 0
                        ? <p className="text-black/60 text-xs font-bold">🔥 {streak} day streak — keep it going!</p>
                        : <p className="text-black/60 text-xs font-bold">Claim your daily points</p>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-green-400 font-black text-sm px-3 py-1.5 rounded-lg border border-black">+10 pts</span>
                    <ArrowRight className="w-5 h-5 text-black/60" />
                  </div>
                </motion.button>
              )}
            </AnimatePresence>
          )}

          <div className="grid md:grid-cols-5 gap-6">

            {/* Left: Quests */}
            <div className="md:col-span-3 space-y-5">
              <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" /> Quests
              </h2>

              {Object.entries(CAT_CONFIG).map(([catKey, catConf]) => {
                const catQuests = isConnected ? (groupedQuests[catKey] || []) : getDefaultQuests(catKey);
                if (catQuests.length === 0) return null;
                return (
                  <div key={catKey} className="space-y-2">
                    {/* Category header */}
                    <div className="flex items-center gap-2">
                      <span className={`${catConf.bg} text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full`}>
                        {catConf.emoji} {catConf.label}
                      </span>
                    </div>

                    {/* Quest cards */}
                    {catQuests.map((quest) => {
                      const questAction = !quest.completed && !quest.canClaim ? QUEST_ACTIONS[quest.action] : undefined;
                      const isComplete = quest.completed;

                      return (
                        <motion.div
                          key={quest.action}
                          whileHover={questAction ? { y: -1 } : {}}
                          className={`border-2 border-black rounded-xl overflow-hidden transition-all ${
                            isComplete
                              ? "bg-gray-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]"
                              : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                          }`}
                          data-testid={`quest-${quest.action}`}
                        >
                          <div className="flex items-center gap-4 px-4 py-3.5">
                            {/* Icon */}
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border-2 ${
                                isComplete
                                  ? "bg-green-100 border-green-300 text-green-600"
                                  : "border-black text-white"
                              }`}
                              style={!isComplete ? { backgroundColor: catConf.color } : {}}
                            >
                              {isComplete ? <Check className="w-5 h-5" /> : (QUEST_ICONS[quest.action] || <Star className="w-5 h-5" />)}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-black text-sm ${isComplete ? "text-gray-400 line-through" : "text-zinc-900"}`}>
                                {quest.title}
                              </p>
                              <p className="text-gray-500 text-xs mt-0.5">{quest.description}</p>
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isComplete ? (
                                <div className="flex items-center gap-1.5 bg-green-100 border border-green-300 text-green-700 font-black text-xs px-2.5 py-1.5 rounded-lg">
                                  <Check className="w-3.5 h-3.5" /> Done
                                </div>
                              ) : quest.canClaim ? (
                                <motion.button
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => claimQuestMutation.mutate(quest.action)}
                                  disabled={claimQuestMutation.isPending}
                                  className="bg-green-500 hover:bg-green-600 text-white font-black text-xs px-3 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50"
                                  data-testid={`button-claim-${quest.action}`}
                                >
                                  Claim +{quest.points}
                                </motion.button>
                              ) : questAction ? (
                                <Link href={questAction.href}>
                                  <span className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs px-3 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-colors whitespace-nowrap" data-testid={`button-go-${quest.action}`}>
                                    {questAction.label} <ExternalLink className="w-3 h-3" />
                                  </span>
                                </Link>
                              ) : (
                                <span className="font-black text-sm text-zinc-800">+{quest.points}</span>
                              )}
                            </div>
                          </div>

                          {/* Points badge strip for locked quests (not connected) */}
                          {!isConnected && !isComplete && !questAction && (
                            <div className="bg-gray-50 border-t border-gray-200 px-4 py-1.5 flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-400 text-[11px] font-bold">+{quest.points} pts — connect to unlock</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Right: Tiers + OG Card */}
            <div className="md:col-span-2 space-y-5">

              {/* Current tier card */}
              {isConnected && (
                <div
                  className="border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  style={{ background: `linear-gradient(135deg, ${currentTier.color}22, ${currentTier.color}08)` }}
                  data-testid="card-points-summary"
                >
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Your Tier</p>
                        <p className="text-xl font-black" style={{ color: currentTier.color }}>{currentTier.emoji} {currentTier.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Points</p>
                        <p className="text-2xl font-black text-zinc-900">{totalPoints.toLocaleString()}</p>
                      </div>
                    </div>
                    {hasOg && pointsData?.totalBonusPoints != null && pointsData.totalBonusPoints > 0 && (
                      <div className="flex items-center gap-1.5 text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg px-2.5 py-1.5 text-xs font-bold mb-2" data-testid="text-og-bonus">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        +{pointsData.totalBonusPoints} bonus from 1.2x OG multiplier
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tier ladder */}
              <div>
                <h2 className="text-xl font-black text-zinc-900 mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Tiers
                </h2>
                <div className="border-2 border-black rounded-xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden" data-testid="card-tier-ladder">
                  {TIERS.map((tier, i) => {
                    const isCurrent = currentTierKey === tier.key;
                    const isUnlocked = isConnected && totalPoints >= tier.min;
                    return (
                      <div
                        key={tier.key}
                        className={`flex items-center gap-3 px-4 py-3 transition-all ${
                          i < TIERS.length - 1 ? "border-b-2 border-black" : ""
                        } ${isCurrent ? "bg-gray-50" : ""} ${!isUnlocked && isConnected ? "opacity-40" : ""}`}
                        data-testid={`tier-${tier.key}`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-base"
                          style={{ backgroundColor: tier.color }}
                        >
                          {tier.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-zinc-900">{tier.label}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: tier.color }}>You</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {tier.max === Infinity ? `${(tier.min / 1000).toFixed(0)}k+ pts` : `${tier.min}–${tier.max} pts`}
                          </span>
                        </div>
                        {isUnlocked && <Check className="w-4 h-4 flex-shrink-0" style={{ color: tier.color }} />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OG Card */}
              <div>
                <h2 className="text-xl font-black text-zinc-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" /> OG Card
                </h2>
                <div className="border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" data-testid="card-og-mint">
                  <div className="bg-black">
                    <video
                      src="/assets/og-card.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full max-h-[260px] object-contain"
                    />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-black text-zinc-900">DUM OG Card</p>
                        <p className="text-gray-500 text-xs">Lifetime membership NFT</p>
                      </div>
                      <span className="bg-green-100 text-green-700 border-2 border-green-400 font-black text-xs px-2.5 py-1 rounded-lg">FREE</span>
                    </div>

                    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Holder Perks</p>
                      {[
                        { icon: "⚡", label: "1.2x Points Multiplier" },
                        { icon: "🏆", label: "+500 pts on claim" },
                        { icon: "🚀", label: "Early feature access" },
                        { icon: "👑", label: "Exclusive OG badge" },
                        { icon: "🎁", label: "Priority airdrops" },
                      ].map((perk, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm">{perk.icon}</span>
                          <span className="text-xs font-bold text-zinc-800">{perk.label}</span>
                        </div>
                      ))}
                    </div>

                    {isConnected ? (
                      hasOg ? (
                        <div className="flex items-center justify-center gap-2 bg-purple-100 border-2 border-purple-400 text-purple-700 font-black text-sm py-2.5 rounded-xl" data-testid="badge-og-active">
                          <Sparkles className="w-4 h-4" /> OG Active — All Perks Unlocked
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ y: -2, x: -2 }}
                          whileTap={{ y: 0, x: 0 }}
                          onClick={() => ogClaimMutation.mutate()}
                          disabled={ogClaimMutation.isPending}
                          className="w-full py-3 font-black text-sm rounded-xl bg-purple-600 hover:bg-purple-700 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
                          data-testid="button-mint-og"
                        >
                          {ogClaimMutation.isPending ? "Claiming..." : "✨ Get OG Card — FREE"}
                        </motion.button>
                      )
                    ) : (
                      <p className="text-center text-xs text-gray-400 py-1 font-bold">Connect wallet to claim</p>
                    )}
                  </div>
                </div>
              </div>

              {/* View profile link */}
              {isConnected && (
                <Link href="/profile">
                  <motion.div
                    whileHover={{ y: -1 }}
                    className="border-2 border-black rounded-xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-3.5 flex items-center justify-between cursor-pointer transition-all"
                  >
                    <span className="font-black text-zinc-900 text-sm">View full profile</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </Link>
              )}

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
