import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { usePrivacy } from "@/lib/privacy-context";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Wallet, Calendar, Users, Gift, Share2, Trophy, Star, Zap, Crown, ChevronRight } from "lucide-react";
import { PrivacyHub } from "@/components/privacy-hub";

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
}

interface PointsData {
  totalPoints: number;
  tier: string;
  ogNftMint: string | null;
  lastDailyLogin: string | null;
  completedQuests: string[];
  history: { action: string; points: number; createdAt: string; referralSource: string | null }[];
  questDefinitions: QuestDef[];
  rank: number;
}

const TIER_CONFIG: Record<string, { color: string; icon: React.ReactNode; bg: string; border: string; next: string; nextPoints: number }> = {
  bronze: { color: "#CD7F32", icon: <Star className="w-5 h-5" />, bg: "bg-amber-900/20", border: "border-amber-700", next: "Silver", nextPoints: 500 },
  silver: { color: "#C0C0C0", icon: <Trophy className="w-5 h-5" />, bg: "bg-gray-300/20", border: "border-gray-400", next: "Gold", nextPoints: 2000 },
  gold: { color: "#FFD700", icon: <Crown className="w-5 h-5" />, bg: "bg-yellow-500/20", border: "border-yellow-500", next: "Diamond", nextPoints: 10000 },
  diamond: { color: "#B9F2FF", icon: <Crown className="w-5 h-5" />, bg: "bg-cyan-500/20", border: "border-cyan-400", next: "", nextPoints: Infinity },
};

const QUEST_LABELS: Record<string, { label: string; description: string }> = {
  connect_wallet: { label: "Connect Wallet", description: "Connect your Phantom wallet" },
  first_token: { label: "Token Creator", description: "Launch your first token" },
  first_market: { label: "Market Maker", description: "Create a prediction market" },
  first_trade: { label: "First Trade", description: "Buy or sell a token" },
  first_bet: { label: "Place a Bet", description: "Bet on a prediction market" },
  first_win: { label: "Winner", description: "Win a prediction market bet" },
  mint_og_nft: { label: "OG Badge", description: "Mint the OG NFT (1.5x boost)" },
  daily_login: { label: "Daily Check-in", description: "Log in daily for bonus points" },
};

export default function Profile() {
  const { privateMode } = usePrivacy();
  const { connectedWallet, disconnectWallet } = useWallet();
  const [, setLocation] = useLocation();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

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

  const tier = TIER_CONFIG[pointsData?.tier || "bronze"] || TIER_CONFIG.bronze;
  const totalPoints = pointsData?.totalPoints || 0;
  const progressToNext = tier.nextPoints === Infinity ? 100 : Math.min(100, (totalPoints / tier.nextPoints) * 100);
  const completedCount = pointsData?.questDefinitions?.filter(q => q.completed).length || 0;
  const totalQuests = pointsData?.questDefinitions?.length || 8;

  const cardStyle = privateMode
    ? "border-2 border-[#4ADE80]/50 bg-zinc-900/50 rounded-xl shadow-[4px_4px_0px_0px_rgba(74,222,128,0.3)]"
    : "border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

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
              <div className="flex gap-2">
                <Link href="/leaderboard">
                  <motion.span
                    whileHover={{ y: -2, x: -2 }}
                    whileTap={{ y: 0, x: 0 }}
                    className={`px-4 py-2 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer inline-flex items-center gap-1 ${
                      privateMode
                        ? "bg-black border-[#4ADE80] text-[#4ADE80] hover:bg-[#4ADE80]/10 font-mono"
                        : "bg-yellow-400 text-black"
                    }`}
                    data-testid="link-leaderboard"
                  >
                    <Trophy className="w-4 h-4" />
                    {privateMode ? "RANKS" : "Leaderboard"}
                  </motion.span>
                </Link>
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
            </div>

            {/* Points & Tier Card */}
            <div className={`${cardStyle} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: tier.color + "30", borderColor: tier.color }}>
                    <span style={{ color: tier.color }}>{tier.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-black ${privateMode ? "text-white font-mono" : "text-black"}`} data-testid="text-total-points">
                        {totalPoints.toLocaleString()}
                      </span>
                      <span className={`text-sm font-bold uppercase ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>pts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase" style={{ color: tier.color }} data-testid="text-tier">
                        {pointsData?.tier || "Bronze"} Tier
                      </span>
                      {pointsData?.ogNftMint && (
                        <span className="text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                          1.5x OG
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                    Rank #{pointsData?.rank || "—"}
                  </span>
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

            {/* Quests Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-black ${privateMode ? "text-white font-mono" : "text-black"}`}>
                  {privateMode ? "> QUESTS" : "Quests"}
                </h2>
                <span className={`text-sm font-bold ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>
                  {completedCount}/{totalQuests} completed
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pointsData?.questDefinitions?.map(quest => {
                  const meta = QUEST_LABELS[quest.action] || { label: quest.action, description: "" };
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
                            {quest.completed ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
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

            {/* Wallet & Referral Row */}
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

            {/* Stats Cards */}
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

            {/* Recent Points History */}
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
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
