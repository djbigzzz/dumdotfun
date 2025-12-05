import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Wallet, Calendar, Users, Gift, Share2 } from "lucide-react";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

export default function Profile() {
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
      const link = `${window.location.origin}?ref=${user.referralCode}`;
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

  const handleLogout = async () => {
    await disconnectWallet();
    setLocation("/");
  };

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
          <p className="text-gray-400 font-mono">User not found</p>
        </div>
      </Layout>
    );
  }

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
                <h1 className="text-3xl font-black text-white mb-2">Your Profile</h1>
                <p className="text-gray-400 text-sm">Manage your wallet and referrals</p>
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-red-600 text-white font-bold text-sm uppercase hover:bg-red-700 transition-all rounded border border-red-500/50"
                data-testid="button-logout"
              >
                Log Out
              </motion.button>
            </div>

            <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-red-500" />
                <h2 className="text-sm font-bold text-gray-400 uppercase">Wallet Address</h2>
              </div>
              <div className="flex items-center justify-between gap-4 bg-zinc-800/50 rounded p-4">
                <p className="text-green-400 font-mono text-sm break-all flex-1">
                  {user.walletAddress}
                </p>
                <motion.button
                  onClick={copyWallet}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                  data-testid="button-copy-wallet"
                >
                  {copiedWallet ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://solscan.io/account/${user.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 text-xs font-mono rounded transition-colors"
                  data-testid="link-solscan"
                >
                  View on Solscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="bg-zinc-900 border border-green-600/30 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-green-500" />
                <h2 className="text-sm font-bold text-gray-400 uppercase">Your Referral Link</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-zinc-800 rounded-lg text-sm font-mono text-gray-400 truncate">
                  {user.referralCode 
                    ? `${window.location.origin}?ref=${user.referralCode}`
                    : "Generating..."
                  }
                </div>
                <motion.button
                  onClick={copyReferralLink}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!user.referralCode}
                  className="px-4 py-3 bg-green-600 text-black font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  data-testid="button-copy-referral"
                >
                  {copiedReferral ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </motion.button>
              </div>

              <p className="text-xs text-gray-500">
                Share this link to earn rewards for every friend who joins!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-gray-400">JOINED</span>
                </div>
                <p className="text-xl font-mono text-yellow-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="bg-green-900/20 border border-green-600/30 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-bold text-gray-400">REFERRALS</span>
                </div>
                <p className="text-xl font-mono text-green-500">
                  {user.referralCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {user.referralCount === 1 ? "friend referred" : "friends referred"}
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-gray-400">REWARDS</span>
                </div>
                <p className="text-xl font-mono text-purple-500">???</p>
                <p className="text-xs text-gray-500 mt-1">Coming at launch</p>
              </motion.div>
            </div>

            {user.referredBy && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <p className="text-xs text-gray-500">
                  You were referred by: <span className="text-green-400 font-mono">{user.referredBy}</span>
                </p>
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-xs text-gray-600">
                Your referral code: <span className="font-mono text-green-400">{user.referralCode || "—"}</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
