import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface User {
  id: string;
  walletAddress: string;
  referralCode: string;
  referralCount: number;
  createdAt: string;
}

export default function Leaderboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { data: leaderboard = [], isLoading } = useQuery<User[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-6xl md:text-7xl font-black text-red-500">
            VILLAGE IDIOTS
          </h1>
          <p className="text-xl text-yellow-500 font-black">
            LEADERBOARD OF LOSSES & REFERRAL DOMINANCE
          </p>
          <p className="text-gray-400 font-mono">
            Top 100 degens ranked by referral count
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="border-4 border-red-500 bg-black/50 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No users yet. Be the first to join!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-4 border-red-500 bg-red-900/20">
                    <th className="px-6 py-4 text-left font-mono font-black text-yellow-500">
                      RANK
                    </th>
                    <th className="px-6 py-4 text-left font-mono font-black text-yellow-500">
                      VICTIM
                    </th>
                    <th className="px-6 py-4 text-left font-mono font-black text-yellow-500">
                      REFERRAL CODE
                    </th>
                    <th className="px-6 py-4 text-right font-mono font-black text-yellow-500">
                      RUINED
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-red-900/30 hover:bg-red-900/10 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-black text-lg text-red-500">
                          {index === 0 && <Crown className="inline mr-2 w-5 h-5" />}
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-300">
                        {user.walletAddress.slice(0, 8)}...
                        {user.walletAddress.slice(-8)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            copyToClipboard(user.referralCode, user.id)
                          }
                          className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-500 text-red-500 hover:bg-red-900/40 transition-all font-mono font-bold"
                          data-testid={`button-copy-referral-${user.id}`}
                        >
                          {user.referralCode}
                          {copiedId === user.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-yellow-500 text-lg">
                        {user.referralCount}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-4 border-yellow-500 bg-black p-8 space-y-4"
        >
          <h2 className="text-2xl font-black text-yellow-500">HOW TO CLIMB</h2>
          <ol className="space-y-3 text-gray-300 font-mono text-sm">
            <li>
              <span className="text-red-500 font-black">1.</span> Connect your
              wallet
            </li>
            <li>
              <span className="text-red-500 font-black">2.</span> Share your
              referral code
            </li>
            <li>
              <span className="text-red-500 font-black">3.</span> Watch the
              degens roll in
            </li>
            <li>
              <span className="text-red-500 font-black">4.</span> RULE THE
              LEADERBOARD
            </li>
          </ol>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
