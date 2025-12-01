import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, Check, Share2, ArrowUpRight, Zap, TrendingDown } from "lucide-react";
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

// Animated background decoration
const GlitchBackground = () => (
  <motion.div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Animated border glitch */}
    <motion.div
      animate={{ x: [0, 4, -4, 0], y: [0, -3, 3, 0] }}
      transition={{ repeat: Infinity, duration: 3 }}
      className="absolute top-0 left-0 right-0 bottom-0 border-2 border-red-600 opacity-30"
    />
    {/* Diagonal stripes animation */}
    <motion.div
      animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
      transition={{ repeat: Infinity, duration: 8 }}
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: "repeating-linear-gradient(45deg, #FF4444 0px, #FF4444 2px, transparent 2px, transparent 20px)",
        backgroundSize: "200% 200%",
      }}
    />
  </motion.div>
);

// Animated scanlines effect
const Scanlines = () => (
  <motion.div
    animate={{ opacity: [0.5, 0.3, 0.5] }}
    transition={{ repeat: Infinity, duration: 2 }}
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage: "repeating-linear-gradient(0deg, rgba(255,68,68,0.15) 0px, rgba(255,68,68,0.15) 1px, transparent 1px, transparent 2px)",
    }}
  />
);

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
            className="w-full max-w-5xl"
          >
            {/* Main Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left: Branding & Message */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col justify-center space-y-8"
              >
                {/* Logo */}
                <motion.img
                  src={heroLogo}
                  alt="DUM.FUN"
                  className="h-32 w-auto"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                />

                {/* Headline */}
                <div className="space-y-4">
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-6xl md:text-7xl font-black text-red-500 leading-tight tracking-tighter"
                  >
                    THE RACE TO ZERO
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-black text-yellow-500 uppercase tracking-wide"
                  >
                    Is Now Live
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-300 font-mono text-lg leading-relaxed"
                  >
                    Join the referral battle. Climb the leaderboard. Become a
                    village idiot.
                  </motion.p>
                </div>

                {/* Stats Preview */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="border-2 border-green-500 bg-green-900/20 p-4">
                    <p className="text-xs font-mono text-green-400 mb-2">USERS ONLINE</p>
                    <p className="text-3xl font-black text-green-500">
                      {leaderboard.length}
                    </p>
                  </div>
                  <div className="border-2 border-yellow-500 bg-yellow-900/20 p-4">
                    <p className="text-xs font-mono text-yellow-400 mb-2">TOP VICTIM</p>
                    <p className="text-3xl font-black text-yellow-500">
                      {leaderboard[0]?.referralCount || 0}
                    </p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right: Login Card */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                {/* Card Background */}
                <GlitchBackground />
                <Scanlines />

                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 6 }}
                  className="relative z-10 border-4 border-red-500 bg-black p-12 space-y-8 shadow-[0_0_50px_rgba(255,68,68,0.4)]"
                >
                  {/* Card Header */}
                  <div className="space-y-2 border-b-2 border-red-900 pb-6">
                    <p className="font-mono text-xs text-red-400 uppercase tracking-widest">
                      ⚡ INSTANT ACCESS
                    </p>
                    <h2 className="text-3xl font-black text-red-500 uppercase">
                      CONNECT & CLIMB
                    </h2>
                  </div>

                  {/* Main CTA Button */}
                  <motion.button
                    onClick={connectWallet}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(255,68,68,0.6)" }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-red-500 hover:bg-red-600 text-black font-black py-5 px-8 border-2 border-white text-xl uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Zap className="w-6 h-6" />
                    CONNECT WALLET
                  </motion.button>

                  {/* Referral Info Box */}
                  {referralCode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border-2 border-yellow-500 bg-yellow-900/20 p-6 space-y-3"
                    >
                      <p className="font-mono text-sm text-yellow-500 uppercase font-black">
                        🎁 INVITED BY
                      </p>
                      <p className="text-2xl font-black text-yellow-400">
                        {referralCode}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        Connect wallet to get credit for them
                      </p>
                    </motion.div>
                  )}

                  {/* Features List */}
                  <div className="space-y-3 border-t border-red-900 pt-6">
                    {[
                      { icon: "📋", text: "Get unique referral code" },
                      { icon: "🔗", text: "Share with your network" },
                      { icon: "📈", text: "Climb the leaderboard" },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1 }}
                        className="flex items-center gap-3 text-gray-300 font-mono"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-sm">{item.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Leaderboard Preview Section */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-16 border-4 border-yellow-500 bg-black p-12"
            >
              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b-2 border-yellow-500 pb-4">
                  <TrendingDown className="w-8 h-8 text-yellow-500" />
                  <h2 className="text-3xl font-black text-yellow-500 uppercase">
                    VILLAGE IDIOTS
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {leaderboard.slice(0, 5).map((leader: User, idx: number) => (
                    <motion.div
                      key={leader.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + idx * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      className="border-2 border-yellow-900 bg-yellow-900/10 p-4 text-center space-y-3 cursor-pointer"
                    >
                      <div className="text-4xl font-black text-red-500">
                        #{idx + 1}
                      </div>
                      <p className="font-mono text-xs text-gray-300 truncate">
                        {leader.walletAddress.slice(0, 6)}...
                        {leader.walletAddress.slice(-6)}
                      </p>
                      <div className="bg-yellow-500 text-black font-black py-2 px-3">
                        {leader.referralCount} ruined
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Link href="/leaderboard">
                  <button className="w-full border-2 border-yellow-500 text-yellow-500 font-black py-4 hover:bg-yellow-900/20 transition-all uppercase tracking-wider">
                    SEE FULL RANKINGS →
                  </button>
                </Link>
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
            className="w-full max-w-2xl"
          >
            <div className="relative">
              <GlitchBackground />
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 6 }}
                className="relative z-10 border-4 border-yellow-500 bg-black p-16 space-y-8 text-center shadow-[0_0_60px_rgba(255,255,0,0.3)]"
              >
                <div className="space-y-4">
                  <p className="font-mono text-sm text-yellow-400 uppercase tracking-widest">
                    🚀 WELCOME TO DUM.FUN
                  </p>
                  <h1 className="text-5xl font-black text-yellow-500 uppercase">
                    CREATE YOUR ACCOUNT
                  </h1>
                  <p className="text-gray-300 font-mono text-lg">
                    Finalize setup to start your journey
                  </p>
                </div>

                <motion.button
                  onClick={() => createUserMutation.mutate()}
                  disabled={createUserMutation.isPending}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(255,255,0,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black py-5 px-8 border-2 border-black text-xl uppercase disabled:opacity-50 transition-all"
                >
                  {createUserMutation.isPending ? "CREATING..." : "CREATE ACCOUNT"}
                </motion.button>

                {referralCode && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-2 border-green-500 bg-green-900/20 p-6"
                  >
                    <p className="text-green-400 font-mono text-sm mb-2">
                      BONUS: Referenced by {referralCode}
                    </p>
                    <p className="text-green-500 font-black text-lg">
                      They'll get credit for your referral!
                    </p>
                  </motion.div>
                )}
              </motion.div>
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
        <div className="space-y-12 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <p className="font-mono text-sm text-green-400 uppercase tracking-widest">
              ✓ ACCOUNT ACTIVE
            </p>
            <h1 className="text-6xl md:text-7xl font-black text-red-500 uppercase">
              YOUR STATS
            </h1>
            <p className="text-gray-400 font-mono text-sm">
              {connectedWallet?.slice(0, 8)}...{connectedWallet?.slice(-8)}
            </p>
          </motion.div>

          {/* Stats Grid - 3 Cards */}
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
                color: "yellow",
                icon: "🏆",
              },
              {
                label: "VICTIMS",
                value: user.referralCount,
                color: "red",
                icon: "💀",
              },
              {
                label: "JOINED",
                value: new Date(user.createdAt).toLocaleDateString(),
                color: "green",
                icon: "📅",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className={`border-4 border-${stat.color}-500 bg-black p-8 text-center space-y-4 cursor-pointer shadow-lg`}
              >
                <p className="text-4xl">{stat.icon}</p>
                <p className={`font-mono text-xs text-${stat.color}-400 uppercase`}>
                  {stat.label}
                </p>
                <p className={`text-4xl font-black text-${stat.color}-500`}>
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
            className="relative border-4 border-green-500 bg-black p-12 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
          >
            <Scanlines />
            <div className="relative z-10 space-y-8">
              <div className="border-b-2 border-green-500 pb-4">
                <p className="font-mono text-xs text-green-400 uppercase tracking-widest">
                  🔗 YOUR POWER
                </p>
                <h2 className="text-4xl font-black text-green-500 uppercase">
                  REFERRAL CODE
                </h2>
              </div>

              {/* Code Display */}
              <div className="space-y-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-green-900/30 border-2 border-green-500 p-8 text-center cursor-pointer"
                  onClick={() => copyToClipboard(user.referralCode)}
                >
                  <p className="text-5xl font-black text-green-500 font-mono tracking-widest">
                    {user.referralCode}
                  </p>
                </motion.div>

                <button
                  onClick={() => copyToClipboard(user.referralCode)}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-4 px-8 border-2 border-black flex items-center justify-center gap-3 text-lg uppercase transition-all active:scale-95"
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
                </button>
              </div>

              {/* Referral URL */}
              <div className="space-y-3 border-t-2 border-green-500 pt-6">
                <p className="font-mono text-xs text-green-400 uppercase">
                  FULL LINK
                </p>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="bg-green-900/20 border-2 border-green-600 p-4 cursor-pointer"
                  onClick={() => copyToClipboard(referralUrl)}
                >
                  <p className="text-xs font-mono text-green-400 break-all">
                    {referralUrl}
                  </p>
                </motion.div>
                <button
                  onClick={() => copyToClipboard(referralUrl)}
                  className="w-full bg-green-600 hover:bg-green-700 text-black font-black py-3 px-6 border-2 border-black flex items-center justify-center gap-2 uppercase"
                >
                  <Copy className="w-4 h-4" />
                  COPY LINK
                </button>
              </div>

              {/* Share Button */}
              <button
                onClick={shareOnX}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 px-8 border-2 border-white flex items-center justify-center gap-3 text-lg uppercase transition-all active:scale-95"
                data-testid="button-share-x-home"
              >
                <Share2 className="w-5 h-5" />
                SHARE ON X
              </button>
            </div>
          </motion.div>

          {/* Leaderboard Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Link href="/leaderboard">
              <button className="w-full border-4 border-yellow-500 text-yellow-500 font-black py-6 hover:bg-yellow-900/30 transition-all text-xl uppercase flex items-center justify-center gap-3 tracking-wider hover:scale-105 active:scale-95">
                <TrendingDown className="w-6 h-6" />
                CHECK LEADERBOARD
                <ArrowUpRight className="w-6 h-6" />
              </button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return null;
}
