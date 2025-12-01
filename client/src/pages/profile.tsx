import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface User {
  id: string;
  walletAddress: string;
  referralCode: string;
  referralCount: number;
  createdAt: string;
}

export default function Profile() {
  const { connectedWallet } = useWallet();
  const [, setLocation] = useLocation();

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
          <div className="space-y-6">
            <h1 className="text-4xl font-black text-red-500">Your Profile</h1>
            
            <div className="space-y-2">
              <p className="text-xs font-mono text-gray-400">WALLET</p>
              <p className="text-lg font-mono text-green-400">{user.walletAddress}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono text-gray-400">REFERRAL CODE</p>
              <p className="text-2xl font-black text-yellow-500">{user.referralCode}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono text-gray-400">REFERRALS</p>
              <p className="text-2xl font-black text-red-500">{user.referralCount}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
