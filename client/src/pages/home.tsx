import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, Check, Share2, Users, TrendingDown, Zap } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

import heroLogo from "@assets/Gemini_Generated_Image_x5cev6x5cev6x5ce_1764330353637.png";

interface User {
  id: string;
  walletAddress: string;
  referralCode: string;
  referralCount: number;
  createdAt: string;
}

export default function Home() {
  const { connectedWallet, connectWallet } = useWallet();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, []);

  const { data: user, isLoading } = useQuery<User | null>({
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

  const { data: leaderboard = [] } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: connectedWallet,
          referralCode: referralCode || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create user");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Welcome to Dum.fun! 🔥");
      queryClient.invalidateQueries({ queryKey: ["user", connectedWallet] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: () => {
      toast.error("Failed to create account");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    if (!user) return;
    const referralUrl = `${window.location.origin}?ref=${user.referralCode}`;
    const text = `just got ruined on @dum_fun 💀 join the chaos: ${referralUrl}`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  // ============ NOT CONNECTED ============
  if (!connectedWallet) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-6xl space-y-8"
          >
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <motion.img
                  src={heroLogo}
                  alt="DUM.FUN"
                  className="h-32 w-auto"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />

                <div className="space-y-4">
                  <h1 className="text-6xl md:text-7xl font-black text-red-500 leading-tight">
                    THE RACE
                    <br />
                    TO ZERO
                  </h1>
                  <p className="text-2xl font-black text-yellow-500 uppercase">
                    Is Now Live
                  </p>
                </div>

                <p className="text-gray-300 font-mono text-sm leading-relaxed max-w-lg">
                  Join the referral battle. Climb the leaderboard. Become a
                  village idiot and earn your place among the degens.
                </p>

                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-black text-green-500">{leaderboard.length}</p>
                    <p className="text-xs font-mono text-gray-400">USERS</p>
                  </div>
                  <div className="w-px bg-gray-700" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-yellow-500">{leaderboard[0]?.referralCount || 0}</p>
                    <p className="text-xs font-mono text-gray-400">TOP RANK</p>
                  </div>
                </div>
              </motion.div>

              {/* Right - CTA Card */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div
                  className="rounded-2xl p-12 space-y-8 border border-red-600/50 relative overflow-hidden group"
                  style={{
                    background: "linear-gradient(135deg, rgba(127,29,29,0.4) 0%, rgba(0,0,0,0.8) 100%)",
                    boxShadow: "0 25px 50px -12px rgba(239,68,68,0.25)",
                  }}
                >
                  {/* Animated background gradient */}
                  <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none" />

                  <div className="relative z-10 space-y-6">
                    {/* Header */}
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-red-400 uppercase tracking-widest">
                        ⚡ START HERE
                      </p>
                      <h2 className="text-3xl font-black text-red-500 uppercase">
                        Connect Wallet
                      </h2>
                      <p className="text-sm text-gray-300 font-mono">
                        Create account and join the leaderboard
                      </p>
                    </div>

                    {/* Main Button */}
                    <motion.button
                      onClick={connectWallet}
                      whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-4 px-8 rounded-lg text-lg uppercase transition-all active:scale-95 flex items-center justify-center gap-3 border border-red-400/50 shadow-lg"
                    >
                      <Zap className="w-5 h-5" />
                      CONNECT WALLET
                    </motion.button>

                    {/* Referral Bonus */}
                    {referralCode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-lg p-5 border border-yellow-600/50"
                        style={{
                          background: "linear-gradient(135deg, rgba(113,63,18,0.4) 0%, rgba(0,0,0,0.6) 100%)",
                        }}
                      >
                        <p className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-2">
                          🎁 INVITED BY
                        </p>
                        <p className="text-xl font-black text-yellow-400">
                          {referralCode}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Connect to get credit
                        </p>
                      </motion.div>
                    )}

                    {/* Features */}
                    <div className="space-y-3 pt-4 border-t border-red-900/50">
                      {[
                        { icon: "📋", text: "Get referral code" },
                        { icon: "🔗", text: "Share to earn" },
                        { icon: "📈", text: "Climb ranks" },
                      ].map((feature, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.1 }}
                          className="flex items-center gap-3 text-gray-300 font-mono text-sm"
                        >
                          <span className="text-lg">{feature.icon}</span>
                          <span>{feature.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Leaderboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div
                className="rounded-2xl p-10 border border-yellow-600/50"
                style={{
                  background: "linear-gradient(135deg, rgba(113,63,18,0.3) 0%, rgba(0,0,0,0.6) 100%)",
                  boxShadow: "0 25px 50px -12px rgba(234,179,8,0.2)",
                }}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-6 h-6 text-yellow-500" />
                    <h2 className="text-2xl font-black text-yellow-500 uppercase">
                      Village Idiots
                    </h2>
                  </div>
                  <Link href="/leaderboard">
                    <button className="text-xs font-mono text-yellow-500 hover:text-yellow-400 cursor-pointer font-black">
                      SEE ALL →
                    </button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {leaderboard.slice(0, 5).map((leader: User, idx: number) => (
                    <motion.div
                      key={leader.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.08 }}
                      whileHover={{ scale: 1.05 }}
                      className="rounded-lg p-4 text-center border border-yellow-900/50"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <p className="text-3xl font-black text-red-500 mb-2">#{idx + 1}</p>
                      <p className="font-mono text-xs text-gray-400 mb-3 truncate">
                        {leader.walletAddress.slice(0, 6)}...
                      </p>
                      <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-black font-black py-2 px-2 rounded text-sm">
                        {leader.referralCount} ruined
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ============ CONNECTED BUT NO ACCOUNT ============
  if (!user && !isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div
              className="rounded-2xl p-12 space-y-8 border border-yellow-600/50"
              style={{
                background: "linear-gradient(135deg, rgba(113,63,18,0.4) 0%, rgba(0,0,0,0.8) 100%)",
                boxShadow: "0 25px 50px -12px rgba(234,179,8,0.2)",
              }}
            >
              <div className="space-y-3 text-center">
                <p className="text-xs font-mono text-yellow-400 uppercase tracking-widest">
                  🚀 Welcome to dum.fun
                </p>
                <h1 className="text-3xl font-black text-yellow-500 uppercase">
                  CREATE ACCOUNT
                </h1>
                <p className="text-sm text-gray-300 font-mono">
                  Finalize setup to start your journey
                </p>
              </div>

              <motion.button
                onClick={() => createUserMutation.mutate()}
                disabled={createUserMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black py-4 px-6 rounded-lg text-lg uppercase disabled:opacity-50 transition-all border border-yellow-400/50"
              >
                {createUserMutation.isPending ? "CREATING..." : "CREATE ACCOUNT"}
              </motion.button>

              {referralCode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg p-4 border border-green-600/50 text-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                >
                  <p className="text-xs font-mono text-green-400 uppercase mb-1">
                    Bonus
                  </p>
                  <p className="text-sm text-green-300">
                    Referenced by <span className="font-black">{referralCode}</span>
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ============ CONNECTED & HAS ACCOUNT - DASHBOARD ============
  if (user) {
    const referralUrl = `${window.location.origin}?ref=${user.referralCode}`;
    const userRank =
      leaderboard.findIndex((u: User) => u.id === user.id) + 1 || "—";

    return (
      <Layout>
        <div className="space-y-8 py-8">
          {/* Profile Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-10 border border-red-600/50"
            style={{
              background: "linear-gradient(135deg, rgba(127,29,29,0.3) 0%, rgba(0,0,0,0.7) 100%)",
              boxShadow: "0 25px 50px -12px rgba(239,68,68,0.15)",
            }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Left - Profile Info */}
              <div className="flex items-center gap-6">
                {/* Avatar Placeholder */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center text-4xl font-black text-red-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                >
                  👤
                </motion.div>

                {/* Profile Details */}
                <div className="space-y-3">
                  <h2 className="text-3xl font-black text-red-500 uppercase">
                    DEGEN #{userRank}
                  </h2>
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-gray-400">WALLET</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-green-400 bg-black/50 px-3 py-1 rounded">
                        {connectedWallet?.slice(0, 12)}...
                      </p>
                      <button
                        onClick={() => copyToClipboard(connectedWallet || "")}
                        className="p-2 hover:bg-red-900/30 rounded transition-all"
                      >
                        <Copy className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Action Buttons */}
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/50 text-red-400 font-mono text-xs uppercase hover:bg-red-600/40 transition-all">
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          </motion.div>

          {/* Season Banner Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-2xl p-8 border border-yellow-600/50 overflow-hidden relative group"
            style={{
              background: "linear-gradient(135deg, rgba(234,179,8,0.2) 0%, rgba(0,0,0,0.7) 100%)",
              boxShadow: "0 25px 50px -12px rgba(234,179,8,0.15)",
            }}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-500 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-2">
                    🎯 Current Season
                  </p>
                  <h2 className="text-3xl md:text-4xl font-black text-yellow-500 uppercase">
                    The Race to Zero
                  </h2>
                </div>
                <p className="text-gray-300 font-mono text-sm leading-relaxed max-w-xl">
                  Climb the leaderboard by referring friends. The more people you bring to Dum.fun, the higher you rank. Welcome to the village of idiots.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareOnX}
                className="px-6 py-3 rounded-lg bg-yellow-600/30 border border-yellow-600/50 text-yellow-400 font-mono text-xs uppercase hover:bg-yellow-600/50 transition-all whitespace-nowrap flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Season
              </motion.button>
            </div>
          </motion.div>

          {/* Rank Progression Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="rounded-2xl p-8 border border-red-600/50"
            style={{
              background: "linear-gradient(135deg, rgba(127,29,29,0.2) 0%, rgba(0,0,0,0.6) 100%)",
              boxShadow: "0 25px 50px -12px rgba(239,68,68,0.1)",
            }}
          >
            <div className="space-y-6">
              <h3 className="text-sm font-mono text-red-400 uppercase tracking-widest">
                📈 Your Progress
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Current Rank */}
                <div className="flex flex-col items-center justify-center space-y-3 p-6 rounded-lg border border-red-600/30 bg-red-900/10">
                  <p className="text-xs font-mono text-gray-400">CURRENT RANK</p>
                  <p className="text-5xl font-black text-red-500">#{userRank === "—" ? "?" : userRank}</p>
                  <p className="text-sm font-mono text-gray-400">{user.referralCount} referrals</p>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col justify-center space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs font-mono text-gray-400">NEXT RANK</p>
                      <p className="text-xs font-mono text-yellow-500 font-black">
                        {Math.max(0, (user.referralCount + 1 === 1 ? 2 : user.referralCount + 1) - user.referralCount)} more
                      </p>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full border border-red-600/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (user.referralCount % 5) * 20)}%` }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="h-full bg-gradient-to-r from-red-500 to-red-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                label: "VICTIMS RUINED",
                value: user.referralCount,
                badge: "+0%",
                badgeColor: "bg-red-600/50",
                gradient: "linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                border: "border-red-600/50",
                icon: "💀",
              },
              {
                label: "ACCOUNT AGE",
                value: `${Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days`,
                badge: "ACTIVE",
                badgeColor: "bg-green-600/50",
                gradient: "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                border: "border-green-600/50",
                icon: "⏱️",
              },
              {
                label: "LEADERBOARD",
                value: `#${userRank === "—" ? "?" : userRank}`,
                badge: "TOP 100",
                badgeColor: "bg-yellow-600/50",
                gradient: "linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                border: "border-yellow-600/50",
                icon: "🏆",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + idx * 0.08 }}
                whileHover={{ scale: 1.03 }}
                className={`rounded-xl p-6 border ${stat.border} relative overflow-hidden group`}
                style={{
                  background: stat.gradient,
                  boxShadow: "0 10px 30px -8px rgba(0,0,0,0.3)",
                }}
              >
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl">{stat.icon}</p>
                    <span className={`text-xs font-mono font-black px-2 py-1 rounded ${stat.badgeColor} text-white`}>
                      {stat.badge}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-gray-400 uppercase">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black text-white break-words">
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Badges/Achievements Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="rounded-2xl p-8 border border-purple-600/50"
            style={{
              background: "linear-gradient(135deg, rgba(88,28,135,0.2) 0%, rgba(0,0,0,0.6) 100%)",
              boxShadow: "0 25px 50px -12px rgba(147,51,234,0.1)",
            }}
          >
            <div className="space-y-6">
              <h3 className="text-sm font-mono text-purple-400 uppercase tracking-widest">
                🏅 Achievements
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "First Step", locked: false, icon: "🚀" },
                  { name: "5 Referrals", locked: user.referralCount < 5, icon: "🎯" },
                  { name: "Top 50", locked: userRank === "—" || parseInt(String(userRank)) > 50, icon: "⭐" },
                  { name: "Legendary", locked: true, icon: "👑" },
                ].map((badge, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    className={`rounded-lg p-4 border text-center space-y-2 ${
                      badge.locked
                        ? "border-gray-700/50 opacity-50"
                        : "border-purple-600/50 bg-purple-600/10 cursor-pointer hover:bg-purple-600/20 transition-all"
                    }`}
                  >
                    <p className="text-3xl">{badge.icon}</p>
                    <p className="text-xs font-mono text-gray-300 font-black">{badge.name}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Referral Code Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div
              className="rounded-2xl p-10 space-y-6 border border-green-600/50"
              style={{
                background: "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(0,0,0,0.8) 100%)",
                boxShadow: "0 25px 50px -12px rgba(34,197,94,0.2)",
              }}
            >
              <div className="space-y-2">
                <p className="text-xs font-mono text-green-400 uppercase tracking-widest">
                  🔗 Your Power
                </p>
                <h2 className="text-2xl font-black text-green-500 uppercase">
                  Referral Code
                </h2>
              </div>

              {/* Code Display */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-lg p-8 text-center cursor-pointer border border-green-600/50"
                style={{
                  background: "rgba(0,0,0,0.4)",
                }}
                onClick={() => copyToClipboard(user.referralCode)}
              >
                <p className="text-5xl font-black text-green-500 font-mono tracking-widest">
                  {user.referralCode}
                </p>
              </motion.div>

              <motion.button
                onClick={() => copyToClipboard(user.referralCode)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-4 px-6 rounded-lg text-lg uppercase transition-all border border-green-400/50 flex items-center justify-center gap-2"
                data-testid="button-copy-referral-home"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    COPIED!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    COPY CODE
                  </>
                )}
              </motion.button>

              {/* Referral URL Section */}
              <div className="space-y-3 border-t border-green-900/50 pt-6">
                <p className="text-xs font-mono text-green-400 uppercase">
                  Full Referral Link
                </p>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="rounded-lg p-4 cursor-pointer border border-green-600/30"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                  }}
                  onClick={() => copyToClipboard(referralUrl)}
                >
                  <p className="text-xs font-mono text-green-400 break-all">
                    {referralUrl}
                  </p>
                </motion.div>
                <button
                  onClick={() => copyToClipboard(referralUrl)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-black font-black py-3 px-6 rounded-lg uppercase transition-all border border-green-500/50 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  COPY LINK
                </button>
              </div>

              {/* Share Button */}
              <motion.button
                onClick={shareOnX}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-4 px-6 rounded-lg text-lg uppercase transition-all border border-red-400/50 flex items-center justify-center gap-2"
                data-testid="button-share-x-home"
              >
                <Share2 className="w-5 h-5" />
                SHARE ON X
              </motion.button>
            </div>
          </motion.div>

          {/* Leaderboard Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/leaderboard">
              <button className="w-full rounded-lg border border-yellow-600/50 text-yellow-500 font-black py-6 hover:bg-yellow-900/20 transition-all text-lg uppercase flex items-center justify-center gap-3 tracking-wider hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, rgba(113,63,18,0.2) 0%, rgba(0,0,0,0.4) 100%)",
                }}
              >
                <TrendingDown className="w-6 h-6" />
                VIEW FULL RANKINGS
              </button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return null;
}
