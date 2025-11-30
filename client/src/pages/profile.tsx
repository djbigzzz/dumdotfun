import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, Check, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface User {
  id: string;
  walletAddress: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  createdAt: string;
}

export default function Profile() {
  const { connectedWallet } = useWallet();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  // Redirect if not connected
  useEffect(() => {
    if (!connectedWallet) {
      setLocation("/");
    }
  }, [connectedWallet, setLocation]);

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
    mutationFn: async (referralCode?: string) => {
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
      toast.success("Account created! 🔥");
    },
    onError: (error) => {
      toast.error("Failed to create account");
      console.error(error);
    },
  });

  const referralUrl = user
    ? `${window.location.origin}?ref=${user.referralCode}`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnX = () => {
    if (!user) return;
    const text = `just got rugged on @dum_fun 💀 join the chaos: ${referralUrl}`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  };

  if (!connectedWallet) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-gray-400">Connect wallet first</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black text-red-500">YOUR PROFILE</h1>
          <p className="text-gray-400 font-mono">{connectedWallet}</p>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : !user ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-4 border-yellow-500 bg-black p-8 space-y-6 text-center"
          >
            <p className="text-yellow-500 font-black text-2xl">
              WELCOME TO DUM.FUN
            </p>
            <p className="text-gray-300">Create your account to start climbing the leaderboard</p>
            <button
              onClick={() => createUserMutation.mutate(undefined)}
              disabled={createUserMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 border-2 border-white disabled:opacity-50"
              data-testid="button-create-account"
            >
              {createUserMutation.isPending ? "CREATING..." : "CREATE ACCOUNT"}
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Referral Code Card */}
            <motion.div
              className="border-4 border-red-500 bg-black p-8 space-y-4"
              whileHover={{ scale: 1.02 }}
            >
              <h2 className="text-2xl font-black text-red-500">REFERRAL CODE</h2>
              <div className="flex gap-4">
                <div className="flex-1 bg-red-900/20 border-2 border-red-500 p-4">
                  <p className="text-gray-400 font-mono text-sm mb-2">CODE</p>
                  <p className="text-3xl font-black text-red-500">
                    {user.referralCode}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(user.referralCode)}
                  className="bg-red-500 hover:bg-red-600 px-6 py-4 text-white font-black border-2 border-white flex items-center gap-2"
                  data-testid="button-copy-code"
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
            </motion.div>

            {/* Referral Link */}
            <motion.div
              className="border-4 border-yellow-500 bg-black p-8 space-y-4"
              whileHover={{ scale: 1.02 }}
            >
              <h2 className="text-2xl font-black text-yellow-500">
                SHARE LINK
              </h2>
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1 bg-yellow-900/20 border-2 border-yellow-500 p-4 overflow-hidden">
                  <p className="text-gray-400 font-mono text-sm mb-2">
                    REFERRAL URL
                  </p>
                  <p className="text-sm font-mono text-yellow-500 break-all">
                    {referralUrl}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(referralUrl)}
                  className="bg-yellow-500 hover:bg-yellow-600 px-6 py-4 text-black font-black border-2 border-black flex items-center gap-2 whitespace-nowrap"
                  data-testid="button-copy-link"
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
            </motion.div>

            {/* Stats */}
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="border-4 border-red-500 bg-black p-6 text-center">
                <p className="text-gray-400 font-mono text-sm mb-2">RUINED</p>
                <p className="text-5xl font-black text-red-500">
                  {user.referralCount}
                </p>
              </div>
              <div className="border-4 border-green-500 bg-black p-6 text-center">
                <p className="text-gray-400 font-mono text-sm mb-2">JOINED</p>
                <p className="text-sm text-green-500 font-mono">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>

            {/* Share Button */}
            <motion.button
              onClick={shareOnX}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-black px-8 py-4 border-2 border-white flex items-center justify-center gap-2 text-lg"
              data-testid="button-share-x"
            >
              <Share2 className="w-5 h-5" />
              SHARE ON X
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
}
