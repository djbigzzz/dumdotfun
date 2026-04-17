import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";

import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Wallet, Calendar, Gift, Share2, Trophy, Star, Flame, Shield, Diamond, Award, Target, TrendingUp, Coins, Loader2, RefreshCw, ArrowDownLeft, X } from "lucide-react";
import { Connection, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
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

interface LeaderboardEntry {
  walletAddress: string;
  totalPoints: number;
  tier: string;
  ogNftMint: string | null;
  periodPoints?: number;
}

interface UserToken {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  marketCapSol: number;
  priceInSol: number;
}

interface HeldToken {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  balance: number;
  priceInSol: number | null;
  valueInSol: number | null;
  marketCapSol: number | null;
  isDumFun: boolean;
  isOnBondingCurve?: boolean;
}

interface HoldingsResponse {
  solBalance: number;
  holdings: HeldToken[];
}

interface UserProfileData {
  walletAddress: string;
  createdAt: string | null;
  tokensCreated: UserToken[];
  followerCount: number;
  followingCount: number;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(0)}`;
  return `${mcSol.toFixed(3)} SOL`;
}

function formatBalance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string; border: string }> = {
  pill_popper: { label: "Fresh Pill", color: "#EC4899", icon: <Star className="w-5 h-5" />, bg: "bg-pink-500/20", border: "border-pink-500" },
  bonding_curve: { label: "Curve Rider", color: "#3B82F6", icon: <TrendingUp className="w-5 h-5" />, bg: "bg-blue-500/20", border: "border-blue-500" },
  degen: { label: "Full Degen", color: "#EAB308", icon: <Flame className="w-5 h-5" />, bg: "bg-yellow-500/20", border: "border-yellow-500" },
  rug_proof: { label: "Diamond Hands", color: "#22C55E", icon: <Shield className="w-5 h-5" />, bg: "bg-green-500/20", border: "border-green-500" },
  solana_god: { label: "On-Chain God", color: "#06B6D4", icon: <Diamond className="w-5 h-5" />, bg: "bg-cyan-500/20", border: "border-cyan-400" },
};

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

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  onboarding: { label: "Onboarding", color: "#3B82F6" },
  activity: { label: "Activity", color: "#EAB308" },
  streaks: { label: "Streaks", color: "#F97316" },
  special: { label: "Special", color: "#A855F7" },
};

type TabType = "overview" | "quests" | "leaderboard" | "coins" | "holdings";
type QuestFilter = "all" | "in_progress" | "completed";

export default function Profile() {
  usePageTitle("/profile");
  const privateMode = false;
  const { connectedWallet, disconnectWallet, connectWallet, ensureSession } = useWallet();
  const [, setLocation] = useLocation();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [questFilter, setQuestFilter] = useState<QuestFilter>("all");
  const [lbPeriod, setLbPeriod] = useState<"all" | "weekly" | "daily">("all");
  const queryClient = useQueryClient();
  const [sellToken, setSellToken] = useState<HeldToken | null>(null);
  const [sellPct, setSellPct] = useState(100);
  const [isSelling, setIsSelling] = useState(false);

  const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

  const handleSell = async () => {
    if (!sellToken || !connectedWallet) return;
    const phantom = (window as any).phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null);
    if (!phantom) { toast.error("Phantom wallet not found"); return; }

    setIsSelling(true);
    try {
      const tokenAmount = (sellToken.balance * sellPct) / 100;
      await ensureSession();
      const res = await apiRequest("POST", "/api/bonding-curve/sell", {
        seller: connectedWallet, mint: sellToken.mint, tokenAmount: tokenAmount.toString(), minSolOut: "0",
      });

      const { transaction: txBase64 } = await res.json();
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      const signedTx = await phantom.signTransaction(transaction);

      const connection = new Connection(SOLANA_RPC, "confirmed");
      let sig: string;
      try {
        sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
        await connection.confirmTransaction(sig, "confirmed");
      } catch (err: any) {
        if (err.message?.includes("already been processed")) {
          const sigBytes = signedTx.signatures[0]?.signature;
          sig = sigBytes ? Buffer.from(sigBytes).toString("base64") : "";
        } else { throw err; }
      }

      toast.success(`Sold ${sellPct}% of ${sellToken.name} — SOL returned to wallet`);
      setSellToken(null);
      queryClient.invalidateQueries({ queryKey: ["my-holdings", connectedWallet] });
    } catch (err: any) {
      toast.error(err.message || "Sell failed");
    } finally {
      setIsSelling(false);
    }
  };

  // No redirect — handled below by showing a connect-wallet prompt

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

  const { data: leaderboardData } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", lbPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?period=${lbPeriod}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === "leaderboard",
  });

  const { data: myCoinsData, isLoading: myCoinsLoading } = useQuery<UserProfileData>({
    queryKey: ["my-coins", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/profile/${connectedWallet}`);
      if (!res.ok) throw new Error("Failed to fetch coins");
      return res.json();
    },
    enabled: !!connectedWallet && activeTab === "coins",
  });

  const { data: holdingsData, isLoading: holdingsLoading, isFetching: holdingsFetching, refetch: refetchHoldings } = useQuery<HoldingsResponse>({
    queryKey: ["my-holdings", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/holdings/${connectedWallet}`);
      if (!res.ok) throw new Error("Failed to fetch holdings");
      return res.json();
    },
    enabled: !!connectedWallet && activeTab === "holdings",
  });

  const { data: solPrice } = useQuery<{ price: number; currency: string }>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: activeTab === "coins" || activeTab === "holdings",
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

  const handleLogout = async () => {
    await disconnectWallet();
    setLocation("/");
  };

  if (!connectedWallet) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-5 text-center px-4">
          <div className="text-5xl">👤</div>
          <div>
            <p className="text-xl font-black text-gray-900 mb-1">Your Profile</p>
            <p className="text-gray-500">Connect your wallet to view your profile, points, and holdings.</p>
          </div>
          <button
            onClick={() => connectWallet()}
            className="px-8 py-3 bg-red-500 text-white font-black text-lg rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            data-testid="button-connect-wallet-profile"
          >
            Connect Wallet
          </button>
        </div>
      </Layout>
    );
  }

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
  const hasOg = !!pointsData?.hasOgCard;
  const progressToNext = !pointsData?.nextTier ? 100 : Math.min(100, (totalPoints / pointsData.nextTier.minPoints) * 100);

  const cardStyle = privateMode
    ? "border-2 border-[#4ADE80]/50 bg-zinc-900/50 rounded-xl shadow-[4px_4px_0px_0px_rgba(74,222,128,0.3)]"
    : "border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const quests = pointsData?.questDefinitions || [];
  const filteredQuests = quests.filter(q => {
    if (questFilter === "completed") return q.completed;
    if (questFilter === "in_progress") return !q.completed && !q.repeatable;
    return true;
  });

  const groupedQuests = filteredQuests.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, QuestDef[]>);

  const completedCount = quests.filter(q => q.completed).length;
  const totalQuests = quests.filter(q => !q.repeatable).length;

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

            {/* Points Header Card */}
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

              {pointsData?.nextTier && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-bold ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                      Progress to {pointsData.nextTier.label}
                    </span>
                    <span className={`font-mono font-bold ${privateMode ? "text-white" : "text-black"}`}>
                      {totalPoints} / {pointsData.nextTier.minPoints.toLocaleString()}
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

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2" data-testid="profile-tabs">
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
              <button onClick={() => setActiveTab("coins")} className={tabStyle("coins")} data-testid="tab-coins">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  {privateMode ? "MY_COINS" : "My Coins"}
                  {(myCoinsData?.tokensCreated?.length ?? 0) > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeTab === "coins" ? (privateMode ? "bg-black text-[#4ADE80]" : "bg-white text-black") : (privateMode ? "bg-[#4ADE80]/20 text-[#4ADE80]" : "bg-gray-200 text-gray-600")}`}>
                      {myCoinsData!.tokensCreated.length}
                    </span>
                  )}
                </span>
              </button>
              <button onClick={() => setActiveTab("holdings")} className={tabStyle("holdings")} data-testid="tab-holdings">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  {privateMode ? "HOLDINGS" : "Holdings"}
                  {holdingsData && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeTab === "holdings" ? (privateMode ? "bg-black text-[#4ADE80]" : "bg-white text-black") : (privateMode ? "bg-[#4ADE80]/20 text-[#4ADE80]" : "bg-gray-200 text-gray-600")}`}>
                      {holdingsData.holdings.length + 1}
                    </span>
                  )}
                </span>
              </button>
            </div>

            {/* Tab Content */}
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
                    {/* Wallet Card */}
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

                    {/* Referral Card */}
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

                  {/* OG Card Section */}
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
                            <p className={`text-xs ${privateMode ? "text-purple-400" : "text-purple-600"}`}>All points boosted by 1.2x</p>
                          </div>
                        </div>
                        <span className="text-lg font-black bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent" data-testid="text-og-boost-active">
                          +20%
                        </span>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-between p-4 rounded-lg border-2 border-dashed ${
                        privateMode ? "border-[#4ADE80]/20 bg-zinc-900" : "border-gray-300 bg-gray-50"
                      }`}>
                        <div>
                          <p className={`text-sm font-bold ${privateMode ? "text-white" : "text-black"}`}>Get OG Card — Free</p>
                          <p className={`text-xs ${privateMode ? "text-[#4ADE80]/40" : "text-gray-500"}`}>Free forever — Permanent 1.2x points boost</p>
                        </div>
                        <motion.button
                          onClick={() => ogClaimMutation.mutate()}
                          disabled={ogClaimMutation.isPending}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`px-4 py-2 font-bold text-xs uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                            privateMode ? "bg-[#4ADE80] text-black" : "bg-purple-500 text-white"
                          } disabled:opacity-50`}
                          data-testid="button-claim-og"
                        >
                          {ogClaimMutation.isPending ? "Claiming..." : "Claim Free OG Card"}
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "quests" && (
                <motion.div
                  key="quests"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className={`flex gap-2 p-1 rounded-lg w-fit ${privateMode ? "border-2 border-[#4ADE80]/30 bg-zinc-900" : "border-2 border-black bg-gray-100"}`}>
                    {(["all", "in_progress", "completed"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setQuestFilter(filter)}
                        className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition-all ${
                          questFilter === filter
                            ? privateMode
                              ? "bg-[#4ADE80] text-black"
                              : "bg-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            : privateMode
                              ? "text-[#4ADE80]/60 hover:text-[#4ADE80]"
                              : "text-gray-500 hover:text-black"
                        }`}
                        data-testid={`filter-quest-${filter}`}
                      >
                        {filter.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  {Object.entries(groupedQuests).map(([category, catQuests]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-6 rounded-full" style={{ backgroundColor: CATEGORY_LABELS[category]?.color || "#ccc" }} />
                        <h3 className={`text-sm font-black uppercase ${privateMode ? "text-white font-mono" : "text-black"}`}>
                          {CATEGORY_LABELS[category]?.label || category}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {catQuests.map((quest) => (
                          <div
                            key={quest.action}
                            className={`${cardStyle} p-4 relative overflow-hidden`}
                            data-testid={`card-quest-${quest.action}`}
                          >
                            {quest.completed && (
                              <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                DONE
                              </div>
                            )}
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                quest.completed
                                  ? "bg-green-500/20 text-green-500"
                                  : privateMode ? "bg-[#4ADE80]/10 text-[#4ADE80]" : "bg-gray-100 text-gray-600"
                              }`}>
                                {QUEST_ICONS[quest.action] || <Star className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-sm font-bold ${privateMode ? "text-white" : "text-black"}`}>
                                    {quest.title}
                                  </p>
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                                    quest.completed
                                      ? "bg-green-500/20 text-green-500"
                                      : privateMode ? "bg-[#4ADE80]/20 text-[#4ADE80]" : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    +{quest.points}
                                    {quest.repeatable && "/day"}
                                  </span>
                                </div>
                                <p className={`text-xs mt-0.5 ${privateMode ? "text-[#4ADE80]/40" : "text-gray-500"}`}>
                                  {quest.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {filteredQuests.length === 0 && (
                    <div className={`text-center py-12 ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                      <p className="font-bold">No quests match this filter</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "leaderboard" && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className={`flex gap-2 p-1 rounded-lg w-fit ${privateMode ? "border-2 border-[#4ADE80]/30 bg-zinc-900" : "border-2 border-black bg-gray-100"}`}>
                    {(["all", "weekly", "daily"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setLbPeriod(p)}
                        className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition-all ${
                          lbPeriod === p
                            ? privateMode ? "bg-[#4ADE80] text-black" : "bg-black text-white"
                            : privateMode ? "text-[#4ADE80]/60" : "text-gray-500 hover:text-black"
                        }`}
                        data-testid={`filter-lb-${p}`}
                      >
                        {p === "all" ? "All Time" : p}
                      </button>
                    ))}
                  </div>

                  <div className={`${cardStyle} overflow-hidden`}>
                    <div className={`grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold uppercase ${
                      privateMode ? "bg-zinc-800 text-[#4ADE80]/60 font-mono" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className="col-span-1">#</span>
                      <span className="col-span-5">Wallet</span>
                      <span className="col-span-3">Tier</span>
                      <span className="col-span-3 text-right">Points</span>
                    </div>
                    {(leaderboardData || []).map((entry, idx) => {
                      const entryTier = TIER_CONFIG[entry.tier] || TIER_CONFIG.pill_popper;
                      const isMe = entry.walletAddress === connectedWallet;
                      return (
                        <div
                          key={entry.walletAddress}
                          className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-t ${
                            isMe
                              ? privateMode ? "bg-[#4ADE80]/10 border-[#4ADE80]/20" : "bg-yellow-50 border-yellow-200"
                              : privateMode ? "border-zinc-800" : "border-gray-100"
                          }`}
                          data-testid={`row-leaderboard-${idx}`}
                        >
                          <span className={`col-span-1 text-sm font-black ${
                            idx < 3
                              ? "text-yellow-500"
                              : privateMode ? "text-[#4ADE80]/40" : "text-gray-400"
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="col-span-5 flex items-center gap-2 min-w-0">
                            <span className={`font-mono text-xs truncate ${privateMode ? "text-white" : "text-black"}`}>
                              {entry.walletAddress.slice(0, 4)}...{entry.walletAddress.slice(-4)}
                            </span>
                            {entry.ogNftMint && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-500">OG</span>
                            )}
                            {isMe && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                privateMode ? "bg-[#4ADE80]/20 text-[#4ADE80]" : "bg-yellow-200 text-yellow-700"
                              }`}>YOU</span>
                            )}
                          </div>
                          <span className="col-span-3 text-xs font-bold" style={{ color: entryTier.color }}>
                            {entryTier.label}
                          </span>
                          <span className={`col-span-3 text-right text-sm font-black ${privateMode ? "text-white font-mono" : "text-black"}`}>
                            {(entry.periodPoints || entry.totalPoints).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                    {(!leaderboardData || leaderboardData.length === 0) && (
                      <div className={`px-4 py-8 text-center ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                        <p className="font-bold">No leaderboard data yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              {activeTab === "coins" && (
                <motion.div
                  key="coins"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className={`${cardStyle} p-6`}>
                    {myCoinsLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-mono text-sm">Loading your coins…</span>
                      </div>
                    ) : myCoinsData?.tokensCreated && myCoinsData.tokensCreated.length > 0 ? (
                      <div className="space-y-3">
                        {myCoinsData.tokensCreated.map((token) => (
                          <Link key={token.mint} href={`/token/${token.mint}`}>
                            <motion.div
                              whileHover={{ x: 4 }}
                              className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer ${
                                privateMode
                                  ? "border-[#4ADE80]/20 hover:border-[#4ADE80]/50 bg-black/50"
                                  : "border-gray-200 hover:border-black bg-gray-50"
                              }`}
                              data-testid={`token-created-${token.mint}`}
                            >
                              <div className={`w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300"}`}>
                                {token.imageUri ? (
                                  <img src={token.imageUri} alt={`${token.name} token`} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center font-black ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-200 text-gray-500"}`}>
                                    {token.symbol[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-black truncate ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                                <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>${token.symbol}</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                  {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                                </div>
                                <div className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>Market Cap</div>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-center py-8 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                        <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-bold">No coins created yet</p>
                        <Link href="/create">
                          <button className={`mt-3 px-4 py-2 font-bold text-sm border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${privateMode ? "bg-[#4ADE80] text-black" : "bg-red-500 text-white"}`}>
                            Launch a Token
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "holdings" && (
                <motion.div
                  key="holdings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className={`${cardStyle} p-6`}>
                    {holdingsLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-mono text-sm">Fetching on-chain balances…</span>
                      </div>
                    ) : holdingsData ? (() => {
                      const totalSol = (holdingsData.solBalance ?? 0) + holdingsData.holdings.reduce((s, h) => s + (h.valueInSol ?? 0), 0);
                      const rowClass = `flex items-center gap-4 p-3 rounded-lg border cursor-pointer ${privateMode ? "border-[#4ADE80]/20 hover:border-[#4ADE80]/50 bg-black/50" : "border-gray-200 hover:border-black bg-gray-50"}`;
                      return (
                        <>
                          {/* Portfolio total bar */}
                          <div className={`flex items-center justify-between mb-4 pb-3 border-b ${privateMode ? "border-zinc-700" : "border-gray-200"}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/60" : "text-gray-400"}`}>Total portfolio value</span>
                              <button
                                onClick={() => refetchHoldings()}
                                disabled={holdingsFetching}
                                title="Refresh balances"
                                data-testid="button-refresh-holdings"
                                className={`p-1 rounded transition-colors ${privateMode ? "hover:bg-zinc-800 text-[#4ADE80]/50 hover:text-[#4ADE80]" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${holdingsFetching ? "animate-spin" : ""}`} />
                              </button>
                            </div>
                            <div className="text-right">
                              <span className={`font-black text-lg ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                {totalSol.toFixed(4)} SOL
                              </span>
                              {solPrice && (
                                <span className={`ml-2 text-sm ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                  ≈ ${(totalSol * solPrice.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* SOL row — always first */}
                            <a href={`https://solscan.io/account/${connectedWallet}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                              <motion.div whileHover={{ x: 4 }} className={rowClass} data-testid="token-sol">
                                <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center ${privateMode ? "border-[#4ADE80]/30 bg-zinc-900" : "border-gray-300 bg-gray-100"}`}>
                                  <img
                                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                    alt="SOL"
                                    className="w-7 h-7 rounded-full"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-black ${privateMode ? "text-white" : "text-gray-900"}`}>Solana</div>
                                  <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                                    {(holdingsData.solBalance ?? 0).toFixed(4)} SOL · native
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                    {(holdingsData.solBalance ?? 0).toFixed(4)} SOL
                                  </div>
                                  {solPrice && (
                                    <div className={`text-xs ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                      ≈ ${((holdingsData.solBalance ?? 0) * solPrice.price).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </a>

                            {/* SPL tokens */}
                            {holdingsData.holdings.map((token) => {
                              const canSell = token.isOnBondingCurve;
                              const row = (
                                <motion.div
                                  whileHover={{ x: canSell ? 0 : 4 }}
                                  className={rowClass}
                                  data-testid={`token-held-${token.mint}`}
                                >
                                  <div className={`w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300"}`}>
                                    {token.imageUri ? (
                                      <img src={token.imageUri} alt={token.name} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className={`w-full h-full flex items-center justify-center font-black text-sm ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-200 text-gray-500"}`}>
                                        {(token.symbol[0] || "?").toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-black truncate ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                                    <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                                      {formatBalance(token.balance)} ${token.symbol}
                                      {!token.isDumFun && !token.isOnBondingCurve && (
                                        <span className={`ml-1.5 ${privateMode ? "text-zinc-600" : "text-gray-300"}`}>· external</span>
                                      )}
                                      {token.isOnBondingCurve && !token.isDumFun && (
                                        <span className="ml-1.5 text-orange-400">· orphaned</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-right">
                                      {token.valueInSol !== null ? (
                                        <>
                                          <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                            {token.valueInSol.toFixed(4)} SOL
                                          </div>
                                          {solPrice && (
                                            <div className={`text-xs ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                              ≈ ${(token.valueInSol * solPrice.price).toFixed(2)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className={`text-xs italic ${privateMode ? "text-zinc-600" : "text-gray-300"}`}>no price</div>
                                      )}
                                    </div>
                                    {canSell && (
                                      <button
                                        data-testid={`button-sell-${token.mint}`}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSellToken(token); setSellPct(100); }}
                                        className="flex items-center gap-1 px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors flex-shrink-0"
                                      >
                                        <ArrowDownLeft className="w-3 h-3" />
                                        Sell
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                              return token.isDumFun ? (
                                <Link key={token.mint} href={`/token/${token.mint}`}>{row}</Link>
                              ) : token.isOnBondingCurve ? (
                                <div key={token.mint}>{row}</div>
                              ) : (
                                <a key={token.mint} href={`https://solscan.io/token/${token.mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer">{row}</a>
                              );
                            })}
                          </div>
                        </>
                      );
                    })() : (
                      <div className={`text-center py-8 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                        <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-bold">Connect wallet to see holdings</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      {/* Sell Modal */}
      {sellToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSellToken(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Sell Tokens</h2>
              <button onClick={() => setSellToken(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                {sellToken.imageUri ? (
                  <img src={sellToken.imageUri} alt={sellToken.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-sm bg-gray-200 text-gray-500">
                    {(sellToken.symbol[0] || "?").toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="font-black text-gray-900">{sellToken.name}</div>
                <div className="text-xs text-gray-500 font-mono">{sellToken.mint.slice(0, 8)}…{sellToken.mint.slice(-6)}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Amount to sell</span>
                <span className="font-bold text-gray-900">{sellPct}%</span>
              </div>
              <input
                type="range" min={1} max={100} value={sellPct}
                onChange={(e) => setSellPct(Number(e.target.value))}
                className="w-full accent-red-500"
                data-testid="input-sell-percentage"
              />
              <div className="flex justify-between mt-2 gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button key={pct} onClick={() => setSellPct(pct)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${sellPct === pct ? "bg-red-500 text-white border-red-500" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"}`}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Tokens to sell</span><span className="font-mono font-bold text-gray-900">{((sellToken.balance * sellPct) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
              {sellToken.valueInSol !== null && (
                <div className="flex justify-between text-gray-600 mt-1"><span>Est. return</span><span className="font-bold text-green-600">~{((sellToken.valueInSol * sellPct) / 100).toFixed(4)} SOL</span></div>
              )}
            </div>

            <button
              data-testid="button-confirm-sell"
              onClick={handleSell}
              disabled={isSelling}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-base transition-colors flex items-center justify-center gap-2"
            >
              {isSelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Selling…</> : <><ArrowDownLeft className="w-4 h-4" /> Sell {sellPct}%</>}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
