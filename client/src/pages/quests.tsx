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
  CalendarCheck, Sparkles
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
  { key: "pill_popper", label: "Pill Popper", min: 0, max: 499, color: "#EC4899", icon: <Star className="w-4 h-4" /> },
  { key: "bonding_curve", label: "Bonding Curve", min: 500, max: 1999, color: "#3B82F6", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "degen", label: "Degen", min: 2000, max: 4999, color: "#EAB308", icon: <Flame className="w-4 h-4" /> },
  { key: "rug_proof", label: "Rug Proof", min: 5000, max: 9999, color: "#22C55E", icon: <Shield className="w-4 h-4" /> },
  { key: "solana_god", label: "Solana God", min: 10000, max: Infinity, color: "#06B6D4", icon: <Diamond className="w-4 h-4" /> },
];

const QUEST_ICONS: Record<string, React.ReactNode> = {
  connect_wallet: <Wallet className="w-4 h-4" />,
  first_trade: <TrendingUp className="w-4 h-4" />,
  first_bet: <Target className="w-4 h-4" />,
  first_token: <Star className="w-4 h-4" />,
  first_market: <Award className="w-4 h-4" />,
  first_win: <Trophy className="w-4 h-4" />,
  daily_login: <Calendar className="w-4 h-4" />,
  streak_7: <Flame className="w-4 h-4" />,
  streak_30: <Flame className="w-4 h-4" />,
  mint_og_nft: <Gift className="w-4 h-4" />,
};

const CAT_COLORS: Record<string, string> = {
  onboarding: "#3B82F6",
  activity: "#EAB308",
  streaks: "#F97316",
  special: "#A855F7",
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
        SystemProgram.transfer({ fromPubkey, toPubkey, lamports: Math.round(priceSol * LAMPORTS_PER_SOL) })
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
      toast.error(error.message.includes("User rejected") ? "Transaction cancelled" : (error.message || "Failed to mint OG Card"));
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
        toast.success(`+${data.points} pts! ${data.streak} day streak`);
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
  const totalQuests = quests.filter(q => !q.repeatable).length;

  const groupedQuests = quests.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, QuestDef[]>);

  const pm = privateMode;
  const card = pm
    ? "border border-[#4ADE80]/40 bg-zinc-900/60 rounded-lg"
    : "border-2 border-black bg-white rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";
  const hd = pm ? "text-[#4ADE80]" : "text-zinc-900";
  const sub = pm ? "text-[#4ADE80]/60" : "text-gray-500";

  const currentTierIdx = TIERS.findIndex(t => t.key === currentTierKey);
  const currentTier = TIERS[currentTierIdx] || TIERS[0];
  const nextTier = TIERS[currentTierIdx + 1];
  const progressPct = nextTier
    ? Math.min(100, ((totalPoints - currentTier.min) / (nextTier.min - currentTier.min)) * 100)
    : 100;

  return (
    <Layout>
      <div className="py-6 md:py-8">
        <div className="max-w-5xl mx-auto px-4 space-y-5">

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
            <div>
              <h1 className={`text-2xl md:text-3xl font-black ${hd}`} data-testid="text-quests-title">
                {pm ? "> QUESTS_" : "Quests & Rewards"}
              </h1>
              <p className={`text-sm ${sub}`}>
                Complete quests, earn points, climb the ranks.
              </p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-2 text-sm">
                {streak > 0 && (
                  <span className={`flex items-center gap-1 px-2 py-1 rounded font-bold ${pm ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600 border border-orange-200"}`}>
                    <Flame className="w-3.5 h-3.5" />{streak}d
                  </span>
                )}
                <span className={`px-2 py-1 rounded font-bold ${pm ? "bg-zinc-800 text-white/70" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                  {completedCount}/{totalQuests} done
                </span>
                {hasOg && (
                  <span className={`px-2 py-1 rounded font-bold ${pm ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600 border border-purple-200"}`}>
                    +50% OG
                  </span>
                )}
              </div>
            )}
          </div>

          {!isConnected && (
            <div className={`${card} p-4 flex items-center justify-between`} data-testid="banner-connect-prompt">
              <div className="flex items-center gap-3">
                <Lock className={`w-5 h-5 ${pm ? "text-[#4ADE80]" : "text-yellow-600"}`} />
                <span className={`font-bold text-sm ${hd}`}>Connect your wallet to track progress</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleConnect}
                disabled={isConnecting}
                className={`px-4 py-2 font-black text-xs rounded-lg ${pm ? "bg-[#4ADE80] text-black" : "bg-red-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"}`}
                data-testid="button-connect-quests"
              >
                {isConnecting ? "..." : "Connect"}
              </motion.button>
            </div>
          )}

          <div className="grid md:grid-cols-5 gap-5">

            <div className="md:col-span-3 space-y-4">
              {isConnected && (
                <div className={`${card} p-4`} data-testid="card-points-summary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: currentTier.color + "20", color: currentTier.color }}>
                        {currentTier.icon}
                      </div>
                      <div>
                        <span className={`text-lg font-black ${hd}`} data-testid="text-total-points">{totalPoints.toLocaleString()}</span>
                        <span className={`text-sm ml-1 ${sub}`}>pts</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: currentTier.color + "20", color: currentTier.color }}>
                      {currentTier.label}
                    </span>
                  </div>
                  {hasOg && pointsData?.totalBonusPoints != null && pointsData.totalBonusPoints > 0 && (
                    <div className={`flex items-center gap-2 mt-2 px-2 py-1.5 rounded ${pm ? "bg-yellow-900/20 border border-yellow-500/30" : "bg-yellow-50 border border-yellow-300"}`} data-testid="text-og-bonus">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                      <span className={`text-xs font-bold ${pm ? "text-yellow-400" : "text-yellow-700"}`}>
                        +{pointsData.totalBonusPoints} bonus pts from 1.5x OG Card multiplier
                      </span>
                    </div>
                  )}
                  {nextTier && (
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${pm ? "bg-zinc-800" : "bg-gray-200"}`}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: currentTier.color }} />
                      </div>
                      <span className={`text-xs font-bold ${sub}`}>{nextTier.min - totalPoints} to {nextTier.label}</span>
                    </div>
                  )}
                </div>
              )}

              {isConnected && (
                (alreadyCheckedIn || claimed) ? (
                  <div className={`w-full rounded-lg p-3 flex items-center justify-between ${pm ? "border border-[#4ADE80]/30 bg-zinc-900/60" : "border-2 border-black bg-green-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"}`} data-testid="card-checkin-done">
                    <div className="flex items-center gap-2">
                      <Check className={`w-5 h-5 ${pm ? "text-[#4ADE80]" : "text-green-600"}`} />
                      <span className={`font-black text-sm ${pm ? "text-[#4ADE80]" : "text-green-700"}`}>Checked in today!</span>
                      {streak > 0 && <span className={`text-xs font-bold ${pm ? "text-[#4ADE80]/60" : "text-green-500"}`}>🔥 {streak} day streak</span>}
                    </div>
                    <span className={`text-xs font-bold ${pm ? "text-[#4ADE80]/50" : "text-green-500"}`}>Come back tomorrow</span>
                  </div>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckIn}
                    disabled={claiming}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-500 border-2 border-black rounded-lg p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between disabled:opacity-70"
                    data-testid="button-daily-checkin-quests"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-black" />
                      <span className="text-black font-black text-sm">{claiming ? "Claiming..." : "Daily Check-in"}</span>
                      {streak > 0 && <span className="text-xs font-bold text-green-900/60">🔥 {streak} day streak</span>}
                    </div>
                    <span className="bg-white border-2 border-black rounded px-2 py-0.5 text-green-600 font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">+10</span>
                  </motion.button>
                )
              )}

              <h2 className={`text-base font-black ${hd}`}>{pm ? "> QUESTS" : "Quests"}</h2>

              {Object.entries({ onboarding: "Onboarding", activity: "Activity", streaks: "Streaks", special: "Special" }).map(([catKey, catLabel]) => {
                const catQuests = isConnected ? (groupedQuests[catKey] || []) : getDefaultQuests(catKey);
                if (catQuests.length === 0) return null;
                const catColor = CAT_COLORS[catKey];
                return (
                  <div key={catKey} className="space-y-1.5">
                    <h3 className={`text-xs font-black uppercase tracking-wider ${pm ? "text-white/50" : "text-gray-400"}`} style={{ color: catColor }}>
                      {catLabel}
                    </h3>
                    {catQuests.map((quest) => (
                      <div
                        key={quest.action}
                        className={`${card} px-3 py-2.5 flex items-center gap-3 ${quest.completed ? "opacity-50" : ""}`}
                        data-testid={`quest-${quest.action}`}
                      >
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${
                            quest.completed ? (pm ? "bg-[#4ADE80]/20" : "bg-green-100") : (pm ? "bg-zinc-800" : "bg-gray-50")
                          }`}
                          style={{ color: quest.completed ? (pm ? "#4ADE80" : "#22C55E") : catColor }}
                        >
                          {quest.completed ? <Check className="w-4 h-4" /> : (QUEST_ICONS[quest.action] || <Star className="w-4 h-4" />)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-xs ${pm ? "text-white" : "text-zinc-900"}`}>{quest.title}</p>
                          <p className={`text-[11px] ${sub} truncate`}>{quest.description}</p>
                        </div>
                        {quest.completed ? (
                          <span className={`text-xs font-black flex-shrink-0 ${pm ? "text-[#4ADE80]" : "text-green-500"}`}>
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : quest.canClaim ? (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); claimQuestMutation.mutate(quest.action); }}
                            disabled={claimQuestMutation.isPending}
                            className={`text-[10px] font-black px-2.5 py-1 rounded flex-shrink-0 ${
                              pm
                                ? "bg-[#4ADE80] text-black hover:bg-[#4ADE80]/80"
                                : "bg-green-500 text-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                            } disabled:opacity-50`}
                            data-testid={`button-claim-${quest.action}`}
                          >
                            Claim +{quest.points}
                          </motion.button>
                        ) : (
                          <span className={`text-xs font-black flex-shrink-0 ${pm ? "text-white/80" : "text-zinc-700"}`}>
                            +{quest.points}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="md:col-span-2 space-y-4">
              <h2 className={`text-base font-black ${hd}`}>{pm ? "> TIERS" : "Tiers"}</h2>
              <div className={`${card} p-3`} data-testid="card-tier-ladder">
                <div className="space-y-1">
                  {TIERS.map((tier) => {
                    const isCurrent = currentTierKey === tier.key;
                    const isUnlocked = isConnected && totalPoints >= tier.min;
                    return (
                      <div
                        key={tier.key}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded transition-all ${
                          isCurrent
                            ? pm ? "bg-[#4ADE80]/10 border border-[#4ADE80]/40" : "bg-gray-50 border border-black"
                            : ""
                        } ${!isCurrent && !isUnlocked ? "opacity-35" : ""}`}
                        data-testid={`tier-${tier.key}`}
                      >
                        <span style={{ color: tier.color }}>{tier.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`font-bold text-xs ${pm ? "text-white" : "text-zinc-900"}`}>{tier.label}</span>
                          {isCurrent && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: tier.color + "25", color: tier.color }}>You</span>}
                        </div>
                        <span className={`text-[10px] font-mono ${sub}`}>
                          {tier.max === Infinity ? `${(tier.min / 1000).toFixed(0)}k+` : `${tier.min}-${tier.max}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <h2 className={`text-base font-black ${hd}`}>{pm ? "> OG_CARD" : "OG Card"}</h2>
              <div className={`${card} overflow-hidden`} data-testid="card-og-mint">
                <div className="w-full bg-black flex items-center justify-center p-3">
                  <video
                    src="/assets/og-card.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-h-[320px] object-contain rounded"
                  />
                </div>
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-black text-sm ${hd}`}>DUM OG Card</p>
                      <p className={`text-[11px] ${sub}`}>Lifetime membership NFT</p>
                    </div>
                    <span className={`text-sm font-black px-2 py-1 rounded ${pm ? "bg-purple-900/40 text-purple-400 border border-purple-500/30" : "bg-purple-100 text-purple-700 border border-purple-300"}`}>0.2 SOL</span>
                  </div>

                  <div className={`rounded-lg p-2.5 space-y-1.5 ${pm ? "bg-zinc-800/80 border border-[#4ADE80]/20" : "bg-gray-50 border border-gray-200"}`}>
                    <p className={`text-[10px] font-black uppercase tracking-wider ${pm ? "text-[#4ADE80]/60" : "text-gray-400"}`}>OG Holder Perks</p>
                    {[
                      { icon: "⚡", label: "1.5x Points Multiplier", desc: "On all earned points, forever" },
                      { icon: "🏆", label: "+500 Quest Reward", desc: "Instant points on mint" },
                      { icon: "🎯", label: "Reduced Trading Fees", desc: "Lower fees on all trades" },
                      { icon: "🚀", label: "Early Access", desc: "First look at new features" },
                      { icon: "👑", label: "OG Badge", desc: "Exclusive profile badge" },
                      { icon: "🎁", label: "Future Airdrops", desc: "Priority for token airdrops" },
                    ].map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-sm flex-shrink-0">{perk.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold ${pm ? "text-white" : "text-zinc-800"}`}>{perk.label}</span>
                          <span className={`text-[10px] ml-1 ${sub}`}>{perk.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {isConnected ? (
                    hasOg ? (
                      <div className={`text-center py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 ${pm ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30" : "bg-green-100 text-green-700 border-2 border-green-300"}`} data-testid="badge-og-active">
                        <Sparkles className="w-3.5 h-3.5" />
                        OG Card Active — All Perks Unlocked
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => ogClaimMutation.mutate()}
                        disabled={ogClaimMutation.isPending}
                        className={`w-full py-2.5 font-black text-sm rounded-lg ${
                          pm ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-purple-600 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                        } disabled:opacity-50 transition-all`}
                        data-testid="button-mint-og"
                      >
                        {ogClaimMutation.isPending ? "Minting..." : "Mint OG Card — 0.2 SOL"}
                      </motion.button>
                    )
                  ) : (
                    <p className={`text-center text-xs py-1.5 ${sub}`}>Connect wallet to mint</p>
                  )}
                </div>
              </div>

              {isConnected && (
                <Link href="/profile">
                  <div className={`${card} p-3 flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity`}>
                    <span className={`text-xs font-bold ${hd}`}>View full profile</span>
                    <ChevronRight className={`w-4 h-4 ${sub}`} />
                  </div>
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

function getDefaultQuests(category: string): QuestDef[] {
  const defaults: Record<string, QuestDef[]> = {
    onboarding: [
      { action: "connect_wallet", points: 50, completed: false, repeatable: false, category: "onboarding", title: "Connect Wallet", description: "Connect your Phantom wallet" },
      { action: "first_trade", points: 100, completed: false, repeatable: false, category: "onboarding", title: "First Trade", description: "Buy or sell any token" },
      { action: "first_bet", points: 100, completed: false, repeatable: false, category: "onboarding", title: "First Bet", description: "Place a prediction market bet" },
    ],
    activity: [
      { action: "first_token", points: 500, completed: false, repeatable: false, category: "activity", title: "Launch a Token", description: "Create your first meme token" },
      { action: "first_market", points: 300, completed: false, repeatable: false, category: "activity", title: "Create a Market", description: "Create a prediction market" },
      { action: "first_win", points: 200, completed: false, repeatable: false, category: "activity", title: "Win a Bet", description: "Win a prediction market bet" },
    ],
    streaks: [
      { action: "daily_login", points: 10, completed: false, repeatable: true, category: "streaks", title: "Daily Check-in", description: "Check in daily for points" },
      { action: "streak_7", points: 150, completed: false, repeatable: false, category: "streaks", title: "7-Day Streak", description: "7 consecutive days" },
      { action: "streak_30", points: 600, completed: false, repeatable: false, category: "streaks", title: "30-Day Streak", description: "30 consecutive days" },
    ],
    special: [
      { action: "mint_og_nft", points: 500, completed: false, repeatable: false, category: "special", title: "Mint OG Card", description: "Get the 1.5x points multiplier" },
    ],
  };
  return defaults[category] || [];
}
