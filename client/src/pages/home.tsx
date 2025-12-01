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
            className="w-full max-w-6xl"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Left Column - Branding */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-1 space-y-6"
              >
                <motion.img
                  src={heroLogo}
                  alt="DUM.FUN"
                  className="h-24 w-auto"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />

                <div className="space-y-3">
                  <h1 className="text-5xl font-black text-red-500 leading-tight">
                    THE RACE TO
                    <br />
                    ZERO
                  </h1>
                  <p className="text-lg font-black text-yellow-500">
                    IS NOW LIVE
                  </p>
                </div>

                <p className="text-gray-300 font-mono text-sm leading-relaxed">
                  Join the referral battle. Climb the leaderboard. Become a
                  village idiot.
                </p>
              </motion.div>

              {/* Middle Column - Main CTA Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-1"
              >
                <div
                  className="rounded-2xl p-10 space-y-8 border border-red-600/50 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(127,29,29,0.4) 0%, rgba(0,0,0,0.8) 100%)",
                    boxShadow: "0 25px 50px -12px rgba(239,68,68,0.2), inset 0 1px 0 0 rgba(239,68,68,0.1)",
                  }}
                >
                  {/* Gradient blur effect */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-600 rounded-full blur-3xl opacity-20 pointer-events-none" />

                  <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                      <p className="text-xs font-mono text-red-400 uppercase tracking-widest">
                        ⚡ INSTANT ACCESS
                      </p>
                      <h2 className="text-2xl font-black text-red-500">
                        CONNECT & CLIMB
                      </h2>
                    </div>

                    <motion.button
                      onClick={connectWallet}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-4 px-6 rounded-lg text-lg uppercase transition-all active:scale-95 flex items-center justify-center gap-3 border border-red-400/50"
                    >
                      <Zap className="w-5 h-5" />
                      CONNECT WALLET
                    </motion.button>

                    {referralCode && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-lg p-4 border border-yellow-600/50"
                        style={{
                          background: "linear-gradient(135deg, rgba(113,63,18,0.3) 0%, rgba(0,0,0,0.5) 100%)",
                        }}
                      >
                        <p className="text-xs font-mono text-yellow-500 uppercase mb-2">
                          🎁 Invited by
                        </p>
                        <p className="text-lg font-black text-yellow-400">
                          {referralCode}
                        </p>
                      </motion.div>
                    )}

                    <div className="space-y-2 pt-2">
                      {[
                        "Get unique referral code",
                        "Share with your network",
                        "Climb the leaderboard",
                      ].map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.1 }}
                          className="flex items-center gap-2 text-gray-300 font-mono text-xs"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {item}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Stats */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-1 space-y-4"
              >
                {[
                  {
                    label: "USERS ONLINE",
                    value: leaderboard.length,
                    gradient:
                      "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                    border: "border-green-600/50",
                    icon: Users,
                  },
                  {
                    label: "TOP VICTIM",
                    value: leaderboard[0]?.referralCount || 0,
                    gradient:
                      "linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                    border: "border-yellow-600/50",
                    icon: TrendingDown,
                  },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className={`rounded-lg p-5 border ${stat.border}`}
                    style={{
                      background: stat.gradient,
                      boxShadow: "0 10px 30px -8px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-gray-400 uppercase">
                        {stat.label}
                      </p>
                      <stat.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <p className="text-3xl font-black text-white mt-2">
                      {stat.value}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Leaderboard Preview - Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12"
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
                    <button className="text-xs font-mono text-yellow-500 hover:text-yellow-400 cursor-pointer">
                      View All →
                    </button>
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {leaderboard.slice(0, 5).map((leader: User, idx: number) => (
                    <motion.div
                      key={leader.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + idx * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      className="rounded-lg p-4 text-center border border-yellow-900/50"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <div className="text-3xl font-black text-red-500 mb-2">
                        #{idx + 1}
                      </div>
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <p className="text-xs font-mono text-green-400 uppercase tracking-widest">
              ✓ ACCOUNT ACTIVE
            </p>
            <h1 className="text-5xl font-black text-red-500 uppercase">
              YOUR STATS
            </h1>
            <p className="text-sm text-gray-400 font-mono">
              {connectedWallet?.slice(0, 8)}...{connectedWallet?.slice(-8)}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                label: "RANK",
                value: `#${userRank}`,
                gradient:
                  "linear-gradient(135deg, rgba(234,179,8,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                border: "border-yellow-600/50",
              },
              {
                label: "VICTIMS",
                value: user.referralCount,
                gradient:
                  "linear-gradient(135deg, rgba(239,68,68,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                border: "border-red-600/50",
              },
              {
                label: "JOINED",
                value: new Date(user.createdAt).toLocaleDateString(),
                gradient:
                  "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(0,0,0,0.7) 100%)",
                border: "border-green-600/50",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`rounded-xl p-6 border ${stat.border}`}
                style={{
                  background: stat.gradient,
                  boxShadow: "0 10px 30px -8px rgba(0,0,0,0.3)",
                }}
              >
                <p className="text-xs font-mono text-gray-400 uppercase mb-3">
                  {stat.label}
                </p>
                <p className="text-4xl font-black text-white break-words">
                  {stat.value}
                </p>
              </motion.div>
            ))}
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
