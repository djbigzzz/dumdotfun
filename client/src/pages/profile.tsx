import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { usePrivacy } from "@/lib/privacy-context";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Wallet, Calendar, Users, Gift, Share2 } from "lucide-react";
import { PrivacyWallet } from "@/components/privacy-wallet";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

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
                <p className={`text-sm ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-500"}`}>
                  {privateMode ? "// IDENTITY_VERIFIED" : "Manage your wallet and referrals"}
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

            <div className={`border-2 border-black rounded-xl p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              privateMode ? "bg-zinc-900/50 border-[#39FF14]/50" : "bg-white shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]"
            }`}>
              <div className="flex items-center gap-2">
                <Wallet className={`w-5 h-5 ${privateMode ? "text-[#39FF14]" : "text-red-500"}`} />
                <h2 className={`text-sm font-bold uppercase ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-500"}`}>
                  {privateMode ? "WALLET_ADDR" : "Wallet Address"}
                </h2>
              </div>
              <div className={`flex items-center justify-between gap-4 border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-black border-[#39FF14]/30" : "bg-gray-100"
              }`}>
                <p className={`font-mono text-sm break-all flex-1 font-bold ${privateMode ? "text-white" : "text-red-500"}`}>
                  {user.walletAddress}
                </p>
                <motion.button
                  onClick={copyWallet}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-shrink-0 transition-colors ${privateMode ? "text-[#39FF14] hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
                  data-testid="button-copy-wallet"
                >
                  {copiedWallet ? (
                    <Check className={`w-5 h-5 ${privateMode ? "text-[#39FF14]" : "text-green-500"}`} />
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
                  className={`flex items-center gap-2 px-3 py-2 border-2 border-black text-xs font-mono rounded-lg transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    privateMode 
                      ? "bg-black border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/10" 
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                  data-testid="link-solscan"
                >
                  {privateMode ? "SOLSCAN_EXPLORER" : "View on Solscan"}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className={`border-2 border-black rounded-xl p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              privateMode ? "bg-black border-[#39FF14]" : "bg-white shadow-[4px_4px_0px_0px_rgba(251,113,133,1)]"
            }`}>
              <div className="flex items-center gap-2">
                <Share2 className={`w-5 h-5 ${privateMode ? "text-[#39FF14]" : "text-pink-500"}`} />
                <h2 className={`text-sm font-bold uppercase ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-500"}`}>
                  {privateMode ? "REFERRAL_LINK" : "Your Referral Link"}
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`flex-1 px-4 py-3 border-2 border-black rounded-lg text-sm font-mono truncate shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  privateMode ? "bg-black border-[#39FF14]/30 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  {user.referralCode 
                    ? `https://dum.fun?ref=${user.referralCode}`
                    : "Generating..."
                  }
                </div>
                <motion.button
                  onClick={copyReferralLink}
                  whileHover={{ y: -1, x: -1 }}
                  whileTap={{ y: 0, x: 0 }}
                  disabled={!user.referralCode}
                  className={`px-4 py-3 font-bold rounded-lg border-2 border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    privateMode 
                      ? "bg-black border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/10" 
                      : "bg-pink-400 text-black hover:bg-pink-500"
                  }`}
                  data-testid="button-copy-referral"
                >
                  {copiedReferral ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </motion.button>
              </div>

              <p className={`text-xs font-medium ${privateMode ? "text-[#39FF14]/40 font-mono" : "text-gray-500"}`}>
                {privateMode ? "// SHARE_FOR_REWARDS" : "Share this link to earn rewards for every friend who joins!"}
              </p>
            </div>

            <PrivacyWallet />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                className={`border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                  privateMode ? "bg-zinc-900/50 border-[#39FF14]/50" : "bg-yellow-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className={`w-4 h-4 ${privateMode ? "text-[#39FF14]" : "text-black"}`} />
                  <span className={`text-xs font-black uppercase ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-black/70"}`}>
                    {privateMode ? "MINT_DATE" : "Joined"}
                  </span>
                </div>
                <p className={`text-xl font-mono font-black ${privateMode ? "text-white" : "text-black"}`}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className={`border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                  privateMode ? "bg-zinc-900/50 border-[#39FF14]/50" : "bg-green-400"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className={`w-4 h-4 ${privateMode ? "text-[#39FF14]" : "text-black"}`} />
                  <span className={`text-xs font-black uppercase ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-black/70"}`}>
                    {privateMode ? "NETWORK_NODES" : "Referrals"}
                  </span>
                </div>
                <p className={`text-xl font-mono font-black ${privateMode ? "text-white" : "text-black"}`}>
                  {user.referralCount}
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className={`border-2 border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                  privateMode ? "bg-zinc-900/50 border-[#39FF14]/50" : "bg-pink-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Gift className={`w-4 h-4 ${privateMode ? "text-[#39FF14]" : "text-black"}`} />
                  <span className={`text-xs font-black uppercase ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-black/70"}`}>
                    {privateMode ? "INCENTIVES" : "Rewards"}
                  </span>
                </div>
                <p className={`text-xl font-mono font-black ${privateMode ? "text-white" : "text-black"}`}>???</p>
                <p className={`text-xs mt-1 font-medium ${privateMode ? "text-[#39FF14]/40 font-mono" : "text-black/60"}`}>
                  {privateMode ? "// UNLOCK_ON_LAUNCH" : "Coming at launch"}
                </p>
              </motion.div>
            </div>

            {user.referredBy && (
              <div className={`border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-black border-[#39FF14]/30 text-[#39FF14]" : "bg-white text-gray-600"
              }`}>
                <p className={`text-sm font-medium ${privateMode ? "font-mono" : ""}`}>
                  {privateMode ? "REFERRER_ID: " : "You were referred by: "}
                  <span className={`font-mono font-bold ${privateMode ? "text-white" : "text-pink-500"}`}>{user.referredBy}</span>
                </p>
              </div>
            )}

            <div className="text-center pt-4">
              <p className={`text-xs font-medium ${privateMode ? "text-[#39FF14]/40 font-mono" : "text-gray-500"}`}>
                {privateMode ? "SESSION_CODE: " : "Your referral code: "}
                <span className={`font-mono font-bold ${privateMode ? "text-white" : "text-pink-500"}`}>{user.referralCode || "—"}</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
