import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
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

  const { data: user } = useQuery<User | null>({
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

  // If logged in, go to profile
  if (connectedWallet && user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-400 font-mono mb-4">Welcome back! Redirecting to profile...</p>
          <Link href="/profile">
            <button className="font-mono text-red-500 hover:text-red-400 underline">
              Or click here
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

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
