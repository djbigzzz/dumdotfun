import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, Check, Share2, ArrowUpRight } from "lucide-react";
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

  // Get referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, []);

  // Fetch user data if connected
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

  // Create or fetch leaderboard
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

  // NOT CONNECTED - Show login screen
  if (!connectedWallet) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-12"
          >
            {/* Logo & Title */}
            <div className="text-center space-y-6">
              <motion.img
                src={heroLogo}
                alt="DUM.FUN"
                className="h-40 w-auto mx-auto drop-shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
              />
              <div className="space-y-3">
                <h1 className="text-6xl md:text-7xl font-black text-red-500">
                  LIVE
                </h1>
                <p className="text-2xl font-black text-yellow-500">
                  THE ANTI-LAUNCHPAD IS OPEN
                </p>
                <p className="text-gray-400 font-mono text-lg">
                  Connect your wallet to join the chaos
                </p>
              </div>
            </div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="border-4 border-red-500 bg-black p-12 space-y-8"
            >
              <div className="space-y-3">
                <p className="font-mono text-sm text-gray-400 uppercase">
                  Step 1: Connect Wallet
                </p>
                <button
                  onClick={connectWallet}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 border-2 border-white text-lg transition-all hover:scale-105 active:scale-95"
                  data-testid="button-connect-login"
                >
                  CONNECT WALLET
                </button>
              </div>

              {/* Referral Info */}
              {referralCode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-2 border-yellow-500 bg-yellow-900/10 p-6 space-y-3"
                >
                  <p className="font-mono text-sm text-yellow-500 uppercase">
                    🎁 Invited by: {referralCode}
                  </p>
                  <p className="text-xs text-gray-400">
                    Connect your wallet above to claim your spot and get credit
                    for your referrer
                  </p>
                </motion.div>
              )}

              <div className="border-t border-red-900 pt-6 space-y-3">
                <p className="font-mono text-sm text-gray-400">
                  🚀 What happens next?
                </p>
                <ol className="space-y-2 text-sm text-gray-300 font-mono">
                  <li>
                    <span className="text-red-500 font-black">1.</span> Get your
                    unique referral code
                  </li>
                  <li>
                    <span className="text-red-500 font-black">2.</span> Share it
                    with degens
                  </li>
                  <li>
                    <span className="text-red-500 font-black">3.</span> Climb
                    the leaderboard
                  </li>
                </ol>
              </div>
            </motion.div>

            {/* Leaderboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border-4 border-yellow-500 bg-black p-8 space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-yellow-500">
                  VILLAGE IDIOTS
                </h2>
                <p className="text-sm text-gray-400 font-mono">
                  Top degens by referrals
                </p>
              </div>

              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((leader: User, idx: number) => (
                  <motion.div
                    key={leader.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center justify-between border-b border-yellow-900/30 pb-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-black text-red-500 text-lg min-w-[30px]">
                        #{idx + 1}
                      </span>
                      <span className="font-mono text-sm text-gray-300">
                        {leader.walletAddress.slice(0, 8)}...
                        {leader.walletAddress.slice(-8)}
                      </span>
                    </div>
                    <span className="font-black text-yellow-500">
                      {leader.referralCount} ruined
                    </span>
                  </motion.div>
                ))}
              </div>

              <Link href="/leaderboard">
                <button className="w-full border-2 border-yellow-500 text-yellow-500 font-mono font-bold py-3 hover:bg-yellow-900/20 transition-all flex items-center justify-center gap-2">
                  VIEW FULL LEADERBOARD
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // CONNECTED BUT NO ACCOUNT - Show account creation
  if (!user && !isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl space-y-8"
          >
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-black text-yellow-500">WELCOME!</h1>
              <p className="text-gray-400 font-mono">
                Create your account to start climbing
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-4 border-yellow-500 bg-black p-12 text-center space-y-6"
            >
              <button
                onClick={() => createUserMutation.mutate()}
                disabled={createUserMutation.isPending}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 border-2 border-white text-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                data-testid="button-create-account-home"
              >
                {createUserMutation.isPending ? "CREATING..." : "CREATE ACCOUNT"}
              </button>

              {referralCode && (
                <p className="text-sm text-yellow-500 font-mono">
                  (You'll get credit for {referralCode}!)
                </p>
              )}
            </motion.div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // CONNECTED & HAS ACCOUNT - Show dashboard
  if (user) {
    const referralUrl = `${window.location.origin}?ref=${user.referralCode}`;
    const userRank =
      leaderboard.findIndex((u: User) => u.id === user.id) + 1 || "—";

    return (
      <Layout>
        <div className="space-y-12 py-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <h1 className="text-6xl md:text-7xl font-black text-red-500">
              YOUR DASHBOARD
            </h1>
            <p className="text-gray-400 font-mono">
              {connectedWallet?.slice(0, 8)}...{connectedWallet?.slice(-8)}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Rank Card */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="border-4 border-yellow-500 bg-black p-8 text-center space-y-3"
            >
              <p className="font-mono text-sm text-gray-400">LEADERBOARD RANK</p>
              <p className="text-5xl font-black text-yellow-500">#{userRank}</p>
            </motion.div>

            {/* Victims Card */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="border-4 border-red-500 bg-black p-8 text-center space-y-3"
            >
              <p className="font-mono text-sm text-gray-400">VICTIMS RUINED</p>
              <p className="text-5xl font-black text-red-500">
                {user.referralCount}
              </p>
            </motion.div>

            {/* Joined Card */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="border-4 border-green-500 bg-black p-8 text-center space-y-3"
            >
              <p className="font-mono text-sm text-gray-400">JOINED</p>
              <p className="text-lg font-mono text-green-500">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </motion.div>
          </motion.div>

          {/* Referral Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="border-4 border-green-500 bg-black p-12 space-y-8"
          >
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-green-500">
                YOUR REFERRAL CODE
              </h2>
              <p className="text-gray-400 font-mono text-sm">
                Share to get more victims on the board
              </p>
            </div>

            {/* Code Display */}
            <div className="flex gap-4 flex-col sm:flex-row">
              <div className="flex-1 bg-green-900/20 border-2 border-green-500 p-6 flex items-center justify-center">
                <p className="text-4xl font-black text-green-500 font-mono">
                  {user.referralCode}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(user.referralCode)}
                className="bg-green-500 hover:bg-green-600 text-black font-black px-8 py-4 border-2 border-black flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                data-testid="button-copy-referral-home"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    COPIED
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    COPY
                  </>
                )}
              </button>
            </div>

            {/* Share URL */}
            <div className="space-y-3">
              <p className="font-mono text-sm text-gray-400">REFERRAL LINK</p>
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1 bg-green-900/20 border-2 border-green-500 p-4 overflow-hidden">
                  <p className="text-xs font-mono text-green-500 break-all">
                    {referralUrl}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(referralUrl)}
                  className="bg-green-500 hover:bg-green-600 text-black font-black px-6 py-2 border-2 border-black flex items-center justify-center gap-2 whitespace-nowrap transition-all hover:scale-105 active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      LINK COPIED
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      COPY LINK
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="border-t border-green-900 pt-6">
              <button
                onClick={shareOnX}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 border-2 border-white flex items-center justify-center gap-2 text-lg transition-all hover:scale-105 active:scale-95"
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
            transition={{ delay: 0.3 }}
          >
            <Link href="/leaderboard">
              <button className="w-full border-4 border-yellow-500 text-yellow-500 font-black py-4 hover:bg-yellow-900/20 transition-all text-lg flex items-center justify-center gap-2">
                VIEW FULL LEADERBOARD
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return null;
}
