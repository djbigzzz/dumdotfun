import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState, useEffect } from "react";
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
    },
    onError: () => {
      toast.error("Failed to create account");
    },
  });

  if (!connectedWallet) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl px-4"
          >
            {/* Hero Section */}
            <div className="text-center space-y-8">
              <motion.img
                src={heroLogo}
                alt="DUM.FUN"
                className="h-24 w-auto mx-auto"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
              />

              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-black text-red-500 leading-tight">
                  THE RACE TO ZERO
                </h1>
                <p className="text-lg font-black text-yellow-500 uppercase">
                  Join the referral battle
                </p>
                <p className="text-gray-300 font-mono text-sm leading-relaxed max-w-lg mx-auto">
                  Climb the leaderboard by referring friends. The more people you bring, the higher you rank.
                </p>
              </div>

              {referralCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg p-4 border border-yellow-600/50 bg-yellow-900/10"
                >
                  <p className="text-xs font-mono text-yellow-400 uppercase mb-2">🎁 Invited by</p>
                  <p className="text-lg font-black text-yellow-400">{referralCode}</p>
                </motion.div>
              )}

              <motion.button
                onClick={connectWallet}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mx-auto max-w-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-3 px-6 rounded-lg text-base uppercase transition-all border border-red-400/50 shadow-lg flex items-center justify-center gap-2"
                data-testid="button-connect-wallet"
              >
                <Zap className="w-5 h-5" />
                CONNECT WALLET
              </motion.button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-gray-400 font-mono">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl px-4 text-center space-y-6"
          >
            <h2 className="text-3xl font-black text-red-500">New to Dum.fun?</h2>
            <p className="text-gray-300 font-mono">Create your account to start earning referrals</p>
            <motion.button
              onClick={() => createUserMutation.mutate()}
              disabled={createUserMutation.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-sm mx-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-3 px-6 rounded-lg uppercase transition-all border border-green-400/50"
              data-testid="button-create-account"
            >
              {createUserMutation.isPending ? "Creating..." : "CREATE ACCOUNT"}
            </motion.button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link href="/profile">
        <div className="text-center py-8 hover:cursor-pointer">
          <p className="text-gray-400 font-mono">Click to view profile</p>
        </div>
      </Link>
    </Layout>
  );
}
