import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect } from "react";
import heroLogo from "@assets/Gemini_Generated_Image_x5cev6x5cev6x5ce_1764330353637.png";

interface User {
  id: string;
  walletAddress: string;
  referralCode: string;
  referralCount: number;
  createdAt: string;
}

export default function Home() {
  const { connectedWallet } = useWallet();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

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

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet, referralCode: null }),
      });
      if (!res.ok) throw new Error("Failed to create account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", connectedWallet] });
    },
  });

  // Auto-create account if wallet connected but no user exists
  useEffect(() => {
    if (connectedWallet && !isLoading && user === null && !createAccountMutation.isPending) {
      createAccountMutation.mutate();
    }
  }, [connectedWallet, isLoading, user, createAccountMutation.isPending]);

  // Redirect to profile when user exists
  useEffect(() => {
    if (user) {
      setLocation("/profile");
    }
  }, [user, setLocation]);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-2xl px-4 text-center space-y-8"
        >
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

          <p className="text-xs text-gray-500 font-mono">
            Click LOG IN in the top right to get started
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}
