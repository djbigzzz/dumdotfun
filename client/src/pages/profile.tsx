import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivacy } from "@/lib/privacy-context";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Wallet, Calendar, Users, Gift, Share2, Trophy, Star, Zap, Crown, ChevronRight, Flame, Shield, Diamond, Award, Target, TrendingUp, Filter } from "lucide-react";
import { PrivacyHub } from "@/components/privacy-hub";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "sonner";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

interface QuestDef {
  action: string;
  points: number;
  completed: boolean;
  repeatable: boolean;
  category: string;
}

interface PointsData {
  totalPoints: number;
  tier: string;
  ogNftMint: string | null;
  lastDailyLogin: string | null;
  streak: number;
  completedQuests: string[];
  history: { action: string; points: number; createdAt: string; referralSource: string | null }[];
  questDefinitions: QuestDef[];
  rank: number;
}

interface LeaderboardEntry {
  walletAddress: string;
  totalPoints: number;
  tier: string;
  ogNftMint: string | null;
  periodPoints?: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string; border: string; next: string; nextPoints: number }> = {
  pill_popper: { label: "Pill Popper", color: "#EC4899", icon: <Star className="w-5 h-5" />, bg: "bg-pink-500/20", border: "border-pink-500", next: "Bonding Curve", nextPoints: 500 },
  bonding_curve: { label: "Bonding Curve", color: "#3B82F6", icon: <TrendingUp className="w-5 h-5" />, bg: "bg-blue-500/20", border: "border-blue-500", next: "Degen", nextPoints: 2000 },
  degen: { label: "Degen", color: "#EAB308", icon: <Flame className="w-5 h-5" />, bg: "bg-yellow-500/20", border: "border-yellow-500", next: "Rug Proof", nextPoints: 5000 },
  rug_proof: { label: "Rug Proof", color: "#22C55E", icon: <Shield className="w-5 h-5" />, bg: "bg-green-500/20", border: "border-green-500", next: "Solana God", nextPoints: 10000 },
  solana_god: { label: "Solana God", color: "#06B6D4", icon: <Diamond className="w-5 h-5" />, bg: "bg-cyan-500/20", border: "border-cyan-400", next: "", nextPoints: Infinity },
};

const QUEST_LABELS: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  connect_wallet: { label: "Connect Wallet", description: "Connect your Phantom wallet", icon: <Wallet className="w-4 h-4" /> },
  first_trade: { label: "First Trade", description: "Buy or sell a token", icon: <TrendingUp className="w-4 h-4" /> },
  first_bet: { label: "Place a Bet", description: "Bet on a prediction market", icon: <Target className="w-4 h-4" /> },
  first_token: { label: "Token Creator", description: "Launch your first token", icon: <Star className="w-4 h-4" /> },
  first_market: { label: "Market Maker", description: "Create a prediction market", icon: <Award className="w-4 h-4" /> },
  first_win: { label: "Winner", description: "Win a prediction market bet", icon: <Trophy className="w-4 h-4" /> },
  daily_login: { label: "Daily Check-in", description: "Log in daily for bonus points", icon: <Calendar className="w-4 h-4" /> },
  streak_7: { label: "7-Day Streak", description: "Check in 7 days in a row", icon: <Flame className="w-4 h-4" /> },
  streak_30: { label: "30-Day Streak", description: "Check in 30 days in a row", icon: <Flame className="w-4 h-4" /> },
  mint_og_nft: { label: "OG Card NFT", description: "Mint the OG Card for 0.2 SOL (1.5x boost)", icon: <Gift className="w-4 h-4" /> },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  onboarding: { label: "Onboarding", color: "#3B82F6" },
  activity: { label: "Activity", color: "#EAB308" },
  streaks: { label: "Streaks", color: "#F97316" },
  special: { label: "Special", color: "#A855F7" },
};

type TabType = "overview" | "quests" | "leaderboard";
type QuestFilter = "all" | "in_progress" | "completed";

export default function Profile() {
  const { privateMode } = usePrivacy();
  const { connectedWallet, disconnectWallet } = useWallet();
  const [, setLocation] = useLocation();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [questFilter, setQuestFilter] = useState<QuestFilter>("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!connectedWallet) {
      setLocation("/");
    }
  }, [connectedWallet, setLocation]);

  const copyWallet = () => {
    if (connectedWallet) {
      navigator.clipboard.writeText(connectedWallet);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (user?.referralCode) {
      const link = `https://dum.fun?ref=${user.referralCode}`;
      navigator.clipboard.writeText(link);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const { data: user, isLoading } = useQuery<UserWithReferrals | null>({
    queryKey: ["user", connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return null;
      const res = await fetch(`/api/users/wallet/${connectedWallet}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!connectedWallet,
  });

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

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", "all"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard?period=all");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "leaderboard",
  });

  const ogClaimMutation = useMutation({
    mutationFn: async () => {
      const infoRes = await fetch("/api/points/og-card-info");
      if (!infoRes.ok) throw new Error("Failed to fetch OG Card info");
      const { priceSol, platformWallet } = await infoRes.json();

      if (!window.solana?.isPhantom) throw new Error("Phantom wallet not found");

      const connection = new Connection("https://api.devnet.solana.com");
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

  const handleLogout = async () => {
    await disconnectWallet();
    setLocation("/");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-gray-600 font-mono font-bold">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-gray-600 font-mono font-bold">User not found</p>
        </div>
      </Layout>
    );
  }

  const tier = TIER_CONFIG[pointsData?.tier || "pill_popper"] || TIER_CONFIG.pill_popper;
  const totalPoints = pointsData?.totalPoints || 0;
  const streak = pointsData?.streak || 0;
  const hasOg = !!pointsData?.ogNftMint;
  const progressToNext = tier.nextPoints === Infinity ? 100 : Math.min(100, (totalPoints / tier.nextPoints) * 100);

  const cardStyle = privateMode
    ? "border-2 border-[#4ADE80]/50 bg-zinc-900/50 rounded-xl shadow-[4px_4px_0px_0px_rgba(74,222,128,0.3)]"
    : "border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const questsByCategory = (pointsData?.questDefinitions || []).reduce((acc, q) => {
    const cat = q.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, QuestDef[]>);

  const filteredQuests = (pointsData?.questDefinitions || []).filter(q => {
    if (questFilter === "completed") return q.completed;
    if (questFilter === "in_progress") return !q.completed;
    return true;
  });

  const filteredByCategory = filteredQuests.reduce((acc, q) => {
    const cat = q.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, QuestDef[]>);

  const completedCount = pointsData?.questDefinitions?.filter(q => q.completed).length || 0;
  const totalQuests = pointsData?.questDefinitions?.length || 10;

  const tabStyle = (tab: TabType) => {
    const isActive = activeTab === tab;
    if (privateMode) {
      return `px-4 py-2.5 font-bold text-sm uppercase rounded-lg border-2 transition-all cursor-pointer ${
        isActive
          ? "bg-[#4ADE80] text-black border-[#4ADE80] font-mono"
          : "bg-zinc-900 text-[#4ADE80]/60 border-[#4ADE80]/30 hover:border-[#4ADE80]/60 font-mono"
      }`;
    }
    return `px-4 py-2.5 font-bold text-sm uppercase rounded-lg border-2 border-black transition-all cursor-pointer ${
      isActive
        ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        : "bg-white text-black hover:bg-gray-100"
    }`;
  };

  return (
    <Layout>
      <div className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mx-auto px-4"
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className={`text-3xl font-black mb-2 ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
                  {privateMode ? "> USER_PROFILE" : "Your Profile"}
                </h1>
                <p className={`text-sm ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-500"}`}>
                  {privateMode ? "// IDENTITY_VERIFIED" : "Manage your wallet, points, and quests"}
                </p>
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ y: -2, x: -2 }}
                whileTap={{ y: 0, x: 0 }}
                className={`px-4 py-2 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  privateMode
                    ? "bg-black border-[#FF1744] text-[#FF1744] hover:bg-[#FF1744]/10 font-mono"
                    : "bg-red-500 text-white"
                }`}
                data-testid="button-logout"
              >
                {privateMode ? "TERMINATE_SESSION" : "Log Out"}
              </motion.button>
            </div>

            <div className={`${cardStyle} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: tier.color + "30", borderColor: tier.color }}>
                    <span style={{ color: tier.color }}>{tier.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-black ${privateMode ? "text-white font-mono" : "text-black"}`} data-testid="text-total-points">
                        {totalPoints.toLocaleString()}
                      </span>
                      <span className={`text-sm font-bold uppercase ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>pts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase" style={{ color: tier.color }} data-testid="text-tier">
                        {tier.label}
                      </span>
                      <span className={`text-xs ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-400"}`}>
                        Rank #{pointsData?.rank || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${privateMode ? "border-[#4ADE80]/30 bg-zinc-800" : "border-black bg-orange-50"}`}>
                    <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-500" : privateMode ? "text-[#4ADE80]/30" : "text-gray-300"}`} />
                    <div>
                      <p className={`text-lg font-black leading-none ${privateMode ? "text-white font-mono" : "text-black"}`} data-testid="text-streak">
                        {streak}
                      </p>
                      <p className={`text-[10px] font-bold uppercase ${privateMode ? "text-[#4ADE80]/40" : "text-gray-500"}`}>
                        day streak
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                    hasOg
                      ? privateMode ? "border-purple-500/50 bg-purple-900/20" : "border-purple-500 bg-purple-50"
                      : privateMode ? "border-[#4ADE80]/20 bg-zinc-800" : "border-gray-300 bg-gray-50"
                  }`}>
                    <Gift className={`w-5 h-5 ${hasOg ? "text-purple-500" : privateMode ? "text-[#4ADE80]/30" : "text-gray-300"}`} />
                    <div>
                      <p className={`text-xs font-black leading-none ${hasOg ? "text-purple-500" : privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`} data-testid="text-og-status">
                        {hasOg ? "+50%" : "0%"}
                      </p>
                      <p className={`text-[10px] font-bold uppercase ${privateMode ? "text-[#4ADE80]/40" : "text-gray-500"}`}>
                        OG Boost
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {tier.next && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-bold ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                      Progress to {tier.next}
                    </span>
                    <span className={`font-mono font-bold ${privateMode ? "text-white" : "text-black"}`}>
                      {totalPoints} / {tier.nextPoints.toLocaleString()}
                    </span>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden border-2 border-black ${privateMode ? "bg-black" : "bg-gray-200"}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNext}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2" data-testid="profile-tabs">
              <button onClick={() => setActiveTab("overview")} className={tabStyle("overview")} data-testid="tab-overview">
                {privateMode ? "OVERVIEW" : "Overview"}
              </button>
              <button onClick={() => setActiveTab("quests")} className={tabStyle("quests")} data-testid="tab-quests">
                {privateMode ? "QUESTS" : "Quests"} ({completedCount}/{totalQuests})
              </button>
              <button onClick={() => setActiveTab("leaderboard")} className={tabStyle("leaderboard")} data-testid="tab-leaderboard">
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  {privateMode ? "RANKS" : "Leaderboard"}
                </span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`${cardStyle} p-5 space-y-3`}>
                      <div className="flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
                        <h2 className={`text-sm font-bold uppercase ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                          Wallet
                        </h2>
                      </div>
                      <div className={`flex items-center gap-2 border-2 border-black rounded-lg p-3 ${privateMode ? "bg-black border-[#4ADE80]/30" : "bg-gray-100"}`}>
                        <p className={`font-mono text-xs break-all flex-1 font-bold ${privateMode ? "text-white" : "text-red-500"}`}>
                          {user.walletAddress}
                        </p>
                        <button onClick={copyWallet} className={`flex-shrink-0 ${privateMode ? "text-[#4ADE80]" : "text-gray-600"}`} data-testid="button-copy-wallet">
                          {copiedWallet ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <a
                        href={`https://solscan.io/account/${user.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 text-xs font-mono font-bold ${privateMode ? "text-[#4ADE80] hover:text-white" : "text-gray-700 hover:text-black"}`}
                        data-testid="link-solscan"
                      >
                        View on Solscan <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div className={`${cardStyle} p-5 space-y-3`}>
                      <div className="flex items-center gap-2">
                        <Share2 className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]" : "text-pink-500"}`} />
                        <h2 className={`text-sm font-bold uppercase ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                          Referral Link
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 px-3 py-2 border-2 border-black rounded-lg text-xs font-mono truncate ${privateMode ? "bg-black border-[#4ADE80]/30 text-white" : "bg-gray-100 text-gray-700"}`}>
                          {user.referralCode ? `dum.fun?ref=${user.referralCode}` : "Generating..."}
                        </div>
                        <button
                          onClick={copyReferralLink}
                          disabled={!user.referralCode}
                          className={`px-3 py-2 font-bold rounded-lg border-2 border-black ${privateMode ? "bg-black border-[#4ADE80] text-[#4ADE80]" : "bg-pink-400 text-black"}`}
                          data-testid="button-copy-referral"
                        >
                          {copiedReferral ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-xs ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-500"}`}>
                          Earn 10% of your referrals' points
                        </p>
                        <span className={`text-sm font-black ${privateMode ? "text-white" : "text-black"}`} data-testid="text-referral-count">
                          {user.referralCount} referred
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`${cardStyle} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className={`w-4 h-4 ${privateMode ? "text-purple-400" : "text-purple-500"}`} />
                      <h2 className={`text-sm font-bold uppercase ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                        OG Card
                      </h2>
                    </div>
                    {hasOg ? (
                      <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        privateMode ? "border-purple-500/50 bg-purple-900/10" : "border-purple-500 bg-purple-50"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Diamond className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className={`text-sm font-black ${privateMode ? "text-white" : "text-black"}`}>OG Card Active</p>
                            <p className={`text-xs ${privateMode ? "text-purple-400" : "text-purple-600"}`}>All points boosted by 1.5x</p>
                          </div>
                        </div>
                        <span className="text-lg font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent" data-testid="text-og-boost-active">
                          +50%
                        </span>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-between p-4 rounded-lg border-2 border-dashed ${
                        privateMode ? "border-[#4ADE80]/30 bg-zinc-800/50" : "border-gray-300 bg-gray-50"
                      }`}>
                        <div>
                          <p className={`text-sm font-bold ${privateMode ? "text-white" : "text-black"}`}>Mint OG Card NFT</p>
                          <p className={`text-xs ${privateMode ? "text-[#4ADE80]/40" : "text-gray-500"}`}>0.2 SOL — permanent 1.5x points multiplier on all actions</p>
                        </div>
                        <motion.button
                          whileHover={{ y: -2, x: -2 }}
                          whileTap={{ y: 0, x: 0 }}
                          onClick={() => ogClaimMutation.mutate()}
                          disabled={ogClaimMutation.isPending}
                          className={`px-4 py-2 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                            privateMode
                              ? "bg-purple-600 border-purple-400 text-white hover:bg-purple-500 font-mono"
                              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          }`}
                          data-testid="button-claim-og"
                        >
                          {ogClaimMutation.isPending ? "Minting..." : "Mint 0.2 SOL"}
                        </motion.button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <motion.div whileHover={{ y: -2 }} className={`${cardStyle} p-4`}>
                      <Calendar className={`w-4 h-4 mb-2 ${privateMode ? "text-[#4ADE80]" : "text-black"}`} />
                      <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                        Joined
                      </p>
                      <p className={`text-lg font-mono font-black ${privateMode ? "text-white" : "text-black"}`}>
                        {new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} className={`${cardStyle} p-4`}>
                      <Users className={`w-4 h-4 mb-2 ${privateMode ? "text-[#4ADE80]" : "text-black"}`} />
                      <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                        Referrals
                      </p>
                      <p className={`text-lg font-mono font-black ${privateMode ? "text-white" : "text-black"}`}>
                        {user.referralCount}
                      </p>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} className={`${cardStyle} p-4`}>
                      <Zap className={`w-4 h-4 mb-2 ${privateMode ? "text-[#4ADE80]" : "text-black"}`} />
                      <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                        Quests Done
                      </p>
                      <p className={`text-lg font-mono font-black ${privateMode ? "text-white" : "text-black"}`}>
                        {completedCount}
                      </p>
                    </motion.div>
                  </div>

                  {privateMode && <PrivacyHub />}

                  {pointsData?.history && pointsData.history.length > 0 && (
                    <div className={`${cardStyle} p-5`}>
                      <h2 className={`text-sm font-black uppercase mb-3 ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                        Recent Points
                      </h2>
                      <div className="space-y-2">
                        {pointsData.history.slice(0, 10).map((entry, i) => (
                          <div key={i} className={`flex items-center justify-between py-2 border-b last:border-0 ${privateMode ? "border-[#4ADE80]/10" : "border-gray-100"}`}>
                            <div>
                              <span className={`text-sm font-bold ${privateMode ? "text-white" : "text-black"}`}>
                                {QUEST_LABELS[entry.action]?.label || entry.action}
                              </span>
                              {entry.referralSource && (
                                <span className={`text-xs ml-2 ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                                  from {entry.referralSource.slice(0, 6)}...
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-black ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                +{entry.points}
                              </span>
                              <span className={`text-xs ${privateMode ? "text-[#4ADE80]/30" : "text-gray-400"}`}>
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {user.referredBy && (
                    <div className={`border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      privateMode ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]" : "bg-white text-gray-600"
                    }`}>
                      <p className={`text-sm font-medium ${privateMode ? "font-mono" : ""}`}>
                        {privateMode ? "REFERRER_ID: " : "Referred by: "}
                        <span className={`font-mono font-bold ${privateMode ? "text-white" : "text-pink-500"}`}>{user.referredBy}</span>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "quests" && (
                <motion.div
                  key="quests"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2" data-testid="quest-filters">
                    {(["all", "in_progress", "completed"] as QuestFilter[]).map(f => (
                      <button
                        key={f}
                        onClick={() => setQuestFilter(f)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase rounded-full border-2 transition-all ${
                          questFilter === f
                            ? privateMode
                              ? "bg-[#4ADE80] text-black border-[#4ADE80]"
                              : "bg-black text-white border-black"
                            : privateMode
                              ? "bg-zinc-900 text-[#4ADE80]/60 border-[#4ADE80]/30 hover:border-[#4ADE80]/60"
                              : "bg-white text-gray-600 border-gray-300 hover:border-black"
                        }`}
                        data-testid={`filter-${f}`}
                      >
                        {f === "all" ? "All" : f === "in_progress" ? "In Progress" : "Completed"}
                      </button>
                    ))}
                  </div>

                  {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
                    const quests = filteredByCategory[catKey];
                    if (!quests || quests.length === 0) return null;
                    return (
                      <div key={catKey}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catInfo.color }} />
                          <h3 className={`text-sm font-black uppercase ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                            {catInfo.label}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {quests.map(quest => {
                            const meta = QUEST_LABELS[quest.action] || { label: quest.action, description: "", icon: <Zap className="w-4 h-4" /> };
                            return (
                              <motion.div
                                key={quest.action}
                                whileHover={{ y: -1 }}
                                className={`p-4 rounded-xl border-2 transition-all ${
                                  quest.completed
                                    ? privateMode
                                      ? "border-[#4ADE80]/50 bg-[#4ADE80]/5"
                                      : "border-green-500 bg-green-50"
                                    : privateMode
                                      ? "border-[#4ADE80]/20 bg-zinc-900/30"
                                      : "border-gray-300 bg-gray-50"
                                }`}
                                data-testid={`quest-${quest.action}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                      quest.completed
                                        ? privateMode ? "bg-[#4ADE80] text-black" : "bg-green-500 text-white"
                                        : privateMode ? "bg-zinc-800 text-[#4ADE80]/50" : "bg-gray-200 text-gray-500"
                                    }`}>
                                      {quest.completed ? <Check className="w-4 h-4" /> : meta.icon}
                                    </div>
                                    <div>
                                      <p className={`text-sm font-bold ${
                                        quest.completed
                                          ? privateMode ? "text-[#4ADE80]" : "text-green-700"
                                          : privateMode ? "text-white" : "text-black"
                                      }`}>
                                        {meta.label}
                                      </p>
                                      <p className={`text-xs ${privateMode ? "text-[#4ADE80]/40" : "text-gray-500"}`}>
                                        {meta.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-sm font-black ${
                                      quest.completed
                                        ? privateMode ? "text-[#4ADE80]/50" : "text-green-500"
                                        : privateMode ? "text-white" : "text-black"
                                    }`}>
                                      +{quest.points}
                                    </span>
                                    {quest.repeatable && (
                                      <p className={`text-[10px] font-bold uppercase ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                                        repeatable
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {activeTab === "leaderboard" && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className={`${cardStyle} overflow-hidden`}>
                    <div className={`px-5 py-3 border-b-2 ${privateMode ? "border-[#4ADE80]/20" : "border-black"}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`text-sm font-black uppercase ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                          Top 50 Players
                        </h3>
                        <Link href="/leaderboard">
                          <span className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${privateMode ? "text-[#4ADE80] hover:text-white" : "text-blue-600 hover:text-black"}`} data-testid="link-full-leaderboard">
                            Full Leaderboard <ChevronRight className="w-3 h-3" />
                          </span>
                        </Link>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {leaderboard?.map((entry, idx) => {
                        const entryTier = TIER_CONFIG[entry.tier] || TIER_CONFIG.pill_popper;
                        const isCurrentUser = entry.walletAddress === connectedWallet;
                        return (
                          <div
                            key={entry.walletAddress}
                            className={`px-5 py-3 flex items-center gap-3 ${
                              isCurrentUser
                                ? privateMode ? "bg-[#4ADE80]/10" : "bg-yellow-50"
                                : privateMode ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
                            } ${privateMode ? "border-[#4ADE80]/10" : ""}`}
                            data-testid={`leaderboard-row-${idx}`}
                          >
                            <span className={`w-8 text-center font-mono font-black text-sm ${
                              idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-600" : privateMode ? "text-[#4ADE80]/40" : "text-gray-400"
                            }`}>
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-sm font-bold truncate ${
                                  isCurrentUser
                                    ? privateMode ? "text-[#4ADE80]" : "text-blue-600"
                                    : privateMode ? "text-white" : "text-black"
                                }`}>
                                  {entry.walletAddress.slice(0, 4)}...{entry.walletAddress.slice(-4)}
                                  {isCurrentUser && " (You)"}
                                </span>
                                {entry.ogNftMint && (
                                  <span className="text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full">
                                    OG
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-black uppercase" style={{ color: entryTier.color }}>
                              {entryTier.label}
                            </span>
                            <span className={`font-mono font-black text-sm ${privateMode ? "text-white" : "text-black"}`}>
                              {entry.totalPoints.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                      {leaderboard && leaderboard.length === 0 && (
                        <div className={`px-5 py-8 text-center ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                          <p className="font-bold">No players yet</p>
                        </div>
                      )}
                      {leaderboard && connectedWallet && !leaderboard.find(e => e.walletAddress === connectedWallet) && (
                        <div className={`px-5 py-3 flex items-center gap-3 border-t-2 ${
                          privateMode ? "bg-[#4ADE80]/10 border-[#4ADE80]/30" : "bg-yellow-50 border-black"
                        }`}>
                          <span className={`w-8 text-center font-mono font-black text-sm ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                            #{pointsData?.rank || "—"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-sm font-bold truncate ${privateMode ? "text-[#4ADE80]" : "text-blue-600"}`}>
                                {connectedWallet.slice(0, 4)}...{connectedWallet.slice(-4)} (You)
                              </span>
                              {hasOg && (
                                <span className="text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full">
                                  OG
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-black uppercase" style={{ color: tier.color }}>
                            {tier.label}
                          </span>
                          <span className={`font-mono font-black text-sm ${privateMode ? "text-white" : "text-black"}`}>
                            {totalPoints.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
