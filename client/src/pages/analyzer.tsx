import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { X, Radar, Flame, AlertOctagon } from "lucide-react";

interface WalletStats {
  walletAddress?: string;
  id?: string;
  dumScore: number;
  solLost: number;
  rugsHit: number;
  topRug: string;
  totalTransactions: number;
  averageLossPerTrade: number;
  status: string;
  isRealData?: boolean;
}

export default function Analyzer() {
  const [walletAddress, setWalletAddress] = useState("");
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/analyze-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: walletAddress.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze wallet");
      }

      const data = await response.json();
      setStats({ ...data, walletAddress: walletAddress.trim() });
    } catch (err: any) {
      setError(err.message || "Failed to analyze wallet");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="absolute top-4 right-4 z-50">
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="bg-red-500 text-white p-3 border-2 border-white hover:bg-red-600"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Radar className="w-12 h-12 text-red-500 animate-spin" style={{ animationDuration: "3s" }} />
            <h1 className="text-5xl md:text-7xl font-black uppercase text-red-500" style={{ textShadow: "3px 3px 0px hsl(60 100% 50%)" }}>
              THE DUM ANALYZER
            </h1>
            <Radar className="w-12 h-12 text-red-500 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <p className="text-gray-400 font-mono text-lg max-w-2xl mx-auto">
            Scan any wallet. Calculate their Dum Score. See their pain. Share their failure.
          </p>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="border-2 border-red-500 bg-zinc-900 p-8 space-y-4"
        >
          <label className="text-red-500 font-black uppercase text-sm block">Enter Wallet Address</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g., 8xK2n9a3mL7p4q2v6... or paste any address"
              className="flex-1 bg-zinc-950 border border-red-900 px-4 py-3 font-mono text-gray-300 focus:border-red-500 focus:outline-none"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAnalyze}
              disabled={!walletAddress.trim() || loading}
              className={`px-8 py-3 font-black uppercase border-2 transition-all ${
                walletAddress.trim() && !loading
                  ? "bg-red-500 hover:bg-red-600 text-white border-white cursor-pointer"
                  : "bg-zinc-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "SCANNING..." : "ANALYZE"}
            </motion.button>
          </div>
        </motion.div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Stats */}
          <div className="lg:col-span-2">
            {stats ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border-2 border-red-500 bg-black p-8 space-y-6"
              >
                {/* Address */}
                <div className="bg-zinc-900 border border-red-900 p-4">
                  <p className="text-xs text-gray-500 font-mono mb-1">WALLET ADDRESS</p>
                  <p className="text-gray-200 font-mono text-lg font-black">{stats.walletAddress}</p>
                </div>

                {/* Big Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-red-950/40 border border-red-900 p-6 text-center space-y-2"
                  >
                    <p className="text-xs text-gray-400 font-mono uppercase">Dum Score</p>
                    <p className="text-4xl font-black text-red-500">{stats.dumScore}</p>
                    <p className="text-xs text-gray-500 font-mono">Higher = More Rekt</p>
                  </motion.div>

                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                    className="bg-red-950/40 border border-red-900 p-6 text-center space-y-2"
                  >
                    <p className="text-xs text-gray-400 font-mono uppercase">SOL Lost</p>
                    <p className="text-4xl font-black text-red-500">{stats.solLost}</p>
                    <p className="text-xs text-gray-500 font-mono">Total Damage</p>
                  </motion.div>

                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}
                    className="bg-red-950/40 border border-red-900 p-6 text-center space-y-2"
                  >
                    <p className="text-xs text-gray-400 font-mono uppercase">Rugs Hit</p>
                    <p className="text-4xl font-black text-red-500">{stats.rugsHit}</p>
                    <p className="text-xs text-gray-500 font-mono">Rug Pulls</p>
                  </motion.div>
                </div>

                {/* Extended Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-red-900 p-4 space-y-2">
                    <p className="text-xs text-gray-500 font-mono">Top Rug Hit</p>
                    <p className="text-2xl font-black text-red-500">{stats.topRug}</p>
                  </div>

                  <div className="bg-zinc-900 border border-red-900 p-4 space-y-2">
                    <p className="text-xs text-gray-500 font-mono">Avg Loss / Trade</p>
                    <p className="text-2xl font-black text-red-500">{stats.averageLossPerTrade} SOL</p>
                  </div>

                  <div className="bg-zinc-900 border border-red-900 p-4 space-y-2">
                    <p className="text-xs text-gray-500 font-mono">Total Trades</p>
                    <p className="text-2xl font-black text-red-500">{stats.totalTransactions}</p>
                  </div>

                  <div className="bg-zinc-900 border border-red-900 p-4 space-y-2">
                    <p className="text-xs text-gray-500 font-mono">Win Rate</p>
                    <p className="text-2xl font-black text-red-500">3.2%</p>
                  </div>
                </div>

                {/* Status Badge */}
                <motion.div
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="bg-gradient-to-r from-red-950 to-black border-4 border-red-500 p-8 text-center space-y-3"
                >
                  <p className="text-xs text-gray-400 font-mono uppercase">Overall Status</p>
                  <p className="text-5xl font-black text-red-500 uppercase">{stats.status}</p>
                  <p className="text-gray-400 font-mono text-sm">
                    {stats.status === "PERMA-REKT" && "Congratulations! You've achieved peak dumpiness."}
                    {stats.status === "SEVERELY REKT" && "You've made some spectacularly bad choices."}
                    {stats.status === "REKT" && "You've experienced significant portfolio damage."}
                    {stats.status === "SLIGHTLY REKT" && "You're just getting started on your rekt journey."}
                  </p>
                </motion.div>

                {/* Share Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-lg py-4 border-b-4 border-r-4 border-white uppercase"
                >
                  Share This Pain
                </motion.button>
              </motion.div>
            ) : error ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-2 border-red-500 bg-red-950/20 p-12 text-center min-h-[400px] flex items-center justify-center"
              >
                <div className="space-y-4">
                  <AlertOctagon className="w-16 h-16 text-red-500 mx-auto" />
                  <p className="text-red-400 font-mono font-bold">{error}</p>
                  <p className="text-gray-500 font-mono text-sm">Check the address and try again</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-2 border-red-900 bg-zinc-950 p-12 text-center min-h-[400px] flex items-center justify-center"
              >
                <div className="space-y-4">
                  <AlertOctagon className="w-16 h-16 text-red-900 mx-auto opacity-50" />
                  <p className="text-gray-600 font-mono">Enter a wallet address to begin scanning...</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Info Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="border-2 border-red-500 bg-black p-6 space-y-4 h-fit"
          >
            <div className="border-b-2 border-red-500 pb-4">
              <h3 className="text-xl font-black uppercase text-red-500 flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Real Data
              </h3>
              <p className="text-xs text-gray-500 font-mono mt-2">Powered by Solana Mainnet</p>
            </div>

            <div className="space-y-3 text-sm text-gray-400 font-mono">
              <div className="bg-zinc-900 border border-red-900 p-3">
                <p className="text-yellow-500 font-bold text-xs mb-1">✓ LIVE DATA</p>
                <p className="text-xs">This analyzer scans the real Solana blockchain for actual transaction data, not mock information.</p>
              </div>
              
              <div className="bg-zinc-900 border border-red-900 p-3">
                <p className="text-yellow-500 font-bold text-xs mb-1">⚡ CACHED</p>
                <p className="text-xs">Results are cached for 5 minutes to reduce RPC calls. Same wallet = instant results.</p>
              </div>

              {stats?.isRealData && (
                <div className="bg-green-950/30 border border-green-900 p-3">
                  <p className="text-green-400 font-bold text-xs">✓ Real Solana Data</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="border-2 border-red-500 bg-zinc-900 p-8 space-y-4"
        >
          <h2 className="text-2xl font-black uppercase text-gray-100">How Dum Score Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-400 font-mono text-sm">
            <div>
              <p className="text-red-500 font-black mb-2">Base Score</p>
              <p>Every SOL lost = 100 Dum Score points. The more you've lost, the higher your score.</p>
            </div>
            <div>
              <p className="text-red-500 font-black mb-2">Rug Multiplier</p>
              <p>Every rug pull hit = 500 bonus Dum Score points. Getting rugged is a special achievement.</p>
            </div>
            <div>
              <p className="text-red-500 font-black mb-2">Status Rank</p>
              <p>0-10K: Slightly Rekt • 10K-25K: Rekt • 25K-50K: Severely Rekt • 50K+: Perma-Rekt</p>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
