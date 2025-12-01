import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  walletAddress: string;
  referralCode: string;
  referralCount: number;
  createdAt: string;
}

export default function Profile() {
  const { connectedWallet, disconnectWallet } = useWallet();
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-2xl px-4"
        >
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-xs font-mono text-gray-400">Your Wallet</p>
                <p className="text-lg font-mono text-green-400 break-all">
                  {user.walletAddress}
                </p>
              </div>
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 font-mono text-xs uppercase hover:bg-red-600/40 transition-all rounded"
                data-testid="button-logout"
              >
                Log Out
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-red-600/30 rounded bg-red-900/10">
                <p className="text-xs font-mono text-gray-400 mb-2">REFERRAL CODE</p>
                <p className="text-2xl font-black text-red-500">{user.referralCode}</p>
              </div>
              <div className="p-4 border border-yellow-600/30 rounded bg-yellow-900/10">
                <p className="text-xs font-mono text-gray-400 mb-2">REFERRALS</p>
                <p className="text-2xl font-black text-yellow-500">{user.referralCount}</p>
              </div>
            </div>

            {/* Copy Code Button */}
            <motion.button
              onClick={() => copyToClipboard(user.referralCode)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-3 px-4 rounded uppercase transition-all border border-green-400/50 flex items-center justify-center gap-2"
              data-testid="button-copy-code"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  COPIED!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  COPY REFERRAL CODE
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
