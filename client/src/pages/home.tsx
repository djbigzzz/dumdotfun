import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Zap, DollarSign, Flame, Radar, AlertOctagon, Wallet } from "lucide-react";

import heroLogo from "@assets/Gemini_Generated_Image_x5cev6x5cev6x5ce_1764330353637.png";

interface Post {
  id: number;
  user: string;
  message: string;
  solBurned: number;
  timestamp: Date;
}

interface WalletStats {
  id: string;
  walletAddress: string;
  dumScore: number;
  solLost: number;
  rugsHit: number;
  topRug: string;
  totalTransactions: number;
  averageLossPerTrade: number;
  status: string;
  createdAt: string;
  isRealData?: boolean;
}


export default function Home() {
  const [, setLocation] = useLocation();
  const { connectedWallet, hasPhantom, connectWallet: contextConnectWallet, disconnectWallet: contextDisconnectWallet } = useWallet();
  
  const [posts, setPosts] = useState<Post[]>([
    { id: 1, user: "degen_420", message: "the only way is down", solBurned: 0.01, timestamp: new Date(Date.now() - 60000) },
    { id: 2, user: "hodler_99", message: "this is gentlemen", solBurned: 0.02, timestamp: new Date(Date.now() - 30000) },
    { id: 3, user: "paper_hands", message: "why did i buy this", solBurned: 0.01, timestamp: new Date(Date.now() - 10000) },
  ]);
  
  const [messageText, setMessageText] = useState("");
  const [currentSolPrice, setCurrentSolPrice] = useState(0.01);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const handleBurnPost = () => {
    if (!messageText.trim()) return;

    const newPost: Post = {
      id: posts.length + 1,
      user: `user_${Math.floor(Math.random() * 10000)}`,
      message: messageText,
      solBurned: currentSolPrice,
      timestamp: new Date(),
    };

    setPosts([newPost, ...posts]);
    setMessageText("");
    setCurrentSolPrice(prev => parseFloat((prev * 2).toFixed(4)));
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await contextConnectWallet();
      setWalletStats(null);
    } catch (err: any) {
      setWalletError(err.message || "Failed to connect wallet");
    }
  };

  const handleDisconnectWallet = async () => {
    await contextDisconnectWallet();
    setWalletStats(null);
    setWalletError(null);
  };

  const handleAnalyzeWallet = async () => {
    if (!connectedWallet) return;
    setLoadingWallet(true);
    
    try {
      const response = await fetch("/api/analyze-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze wallet");
      }

      const data = await response.json();
      setWalletStats(data);
    } catch (error) {
      console.error("Error analyzing wallet:", error);
      alert("Failed to analyze wallet. Please try again.");
    } finally {
      setLoadingWallet(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="min-h-[50vh] flex flex-col justify-center items-center text-center mb-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 flex flex-col items-center"
        >
          <img
            src={heroLogo}
            alt="DUM.FUN"
            className="h-64 md:h-80 w-auto"
          />
          <div className="space-y-2">
            <p className="text-lg text-gray-400 font-mono max-w-2xl mx-auto">
              Where tokens launch EXPENSIVE and crash IMMEDIATELY
            </p>
          </div>
        </motion.div>

        {/* Coming Soon Badge */}
        <motion.div
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="bg-red-500 text-white font-black text-4xl px-12 py-6 border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] uppercase"
        >
          COMING SOON
        </motion.div>
      </section>

      {/* Main Two-Column Section */}
      <section className="mb-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: The Dum Wall */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="border-2 border-red-500 bg-zinc-900 min-h-[700px] flex flex-col"
        >
          {/* Header */}
          <div className="bg-red-900/40 border-b-2 border-red-500 p-4">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-red-500 animate-bounce" />
              <h2 className="text-2xl font-black uppercase text-gray-100">THE DUM WALL</h2>
              <span className="text-xs font-mono text-gray-500 ml-auto">{posts.length} POSTS</span>
            </div>
            <p className="text-gray-400 font-mono text-sm mt-2">Burn SOL to post. Higher burn = higher visibility.</p>
          </div>

          {/* Posts Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-l-4 pl-4 py-2 ${
                  post.solBurned >= 0.08 ? "border-red-500 bg-red-950/20" : "border-red-900 bg-zinc-800/30"
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-1">
                  <div>
                    <span className="text-yellow-500 font-bold text-sm">{post.user}</span>
                    <span className="text-gray-600 text-xs ml-2 font-mono">
                      {Math.floor((Date.now() - post.timestamp.getTime()) / 1000)}s ago
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-red-950 px-2 py-1 rounded text-xs">
                    <Flame className="w-3 h-3 text-red-500" />
                    <span className="font-mono font-bold text-red-400">{post.solBurned} SOL</span>
                  </div>
                </div>
                <p className="text-gray-300 font-mono text-sm">{post.message}</p>
              </motion.div>
            ))}
          </div>

          {/* Burn Box */}
          <div className="border-t-2 border-red-900 bg-black p-4 space-y-4">
            <label className="text-xs font-mono text-gray-400 uppercase block">Your Message</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Share your pain..."
              className="w-full bg-zinc-950 border border-red-900 p-3 font-terminal text-sm text-gray-300 focus:border-red-500 focus:outline-none resize-none h-20"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-950 border border-red-900 p-3 text-center">
                <p className="text-xs text-gray-500 font-mono mb-1">BURN</p>
                <motion.p
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-lg font-black text-red-500 font-mono"
                >
                  {currentSolPrice.toFixed(4)} ◎
                </motion.p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBurnPost}
                disabled={!messageText.trim()}
                className={`font-black uppercase border-b-2 border-r-2 transition-all flex items-center justify-center gap-2 ${
                  messageText.trim()
                    ? "bg-red-500 hover:bg-red-600 text-white border-gray-300 cursor-pointer"
                    : "bg-zinc-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50"
                }`}
              >
                <Flame className="w-4 h-4" />
                BURN
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: The Dum Analyzer */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="border-2 border-red-500 bg-black p-6 flex flex-col min-h-[700px]"
        >
          {/* Header */}
          <div className="border-b-2 border-red-500 pb-4 mb-4">
            <h3 className="text-2xl font-black uppercase text-red-500 flex items-center gap-2 mb-2">
              <Radar className="w-6 h-6 animate-spin" style={{ animationDuration: "3s" }} />
              DUM ANALYZER
            </h3>
            <p className="text-xs text-gray-500 font-mono">Scan any wallet</p>
          </div>

          {/* Wallet Connection */}
          {!connectedWallet ? (
            <div className="space-y-3 mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnectWallet}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black uppercase text-sm py-3 border-b-2 border-r-2 border-gray-300 cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                CONNECT PHANTOM
              </motion.button>
              {walletError && (
                <p className="text-xs text-red-500 font-mono text-center">{walletError}</p>
              )}
              <p className="text-xs text-gray-600 font-mono text-center">
                {hasPhantom ? "Click to connect your Phantom wallet" : "Install Phantom wallet to analyze"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              <div className="bg-zinc-950 border border-red-500 p-3 rounded space-y-2">
                <p className="text-xs text-gray-500 font-mono">CONNECTED WALLET</p>
                <p className="text-xs font-mono text-gray-300 break-all">{connectedWallet}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAnalyzeWallet}
                  disabled={loadingWallet}
                  className={`py-2 font-black uppercase text-sm border-b-2 border-r-2 transition-all flex items-center justify-center gap-2 ${
                    !loadingWallet
                      ? "bg-red-500 hover:bg-red-600 text-white border-gray-300 cursor-pointer"
                      : "bg-zinc-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50"
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  {loadingWallet ? "SCANNING..." : "ANALYZE"}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDisconnectWallet}
                  className="py-2 font-black uppercase text-sm border-b-2 border-r-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 border-gray-600 cursor-pointer transition-all"
                >
                  DISCONNECT
                </motion.button>
              </div>
            </div>
          )}

          {/* Results */}
          {walletStats ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3 flex-1"
            >
              {/* Data Source Indicator */}
              <div className={`text-center py-1 px-2 text-xs font-mono ${
                walletStats.isRealData 
                  ? "bg-green-950/50 border border-green-700 text-green-400" 
                  : "bg-yellow-950/50 border border-yellow-700 text-yellow-400"
              }`}>
                {walletStats.isRealData ? "📡 LIVE ON-CHAIN DATA" : "⚠️ SIMULATED DATA (RPC UNAVAILABLE)"}
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-3 gap-2">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="bg-red-950/40 border border-red-900 p-3 text-center space-y-1"
                >
                  <p className="text-xs text-gray-400 font-mono">SCORE</p>
                  <p className="text-2xl font-black text-red-500">{walletStats.dumScore}</p>
                </motion.div>

                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                  className="bg-red-950/40 border border-red-900 p-3 text-center space-y-1"
                >
                  <p className="text-xs text-gray-400 font-mono">SOL LOST</p>
                  <p className="text-2xl font-black text-red-500">{walletStats.solLost}</p>
                </motion.div>

                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}
                  className="bg-red-950/40 border border-red-900 p-3 text-center space-y-1"
                >
                  <p className="text-xs text-gray-400 font-mono">RUGS HIT</p>
                  <p className="text-2xl font-black text-red-500">{walletStats.rugsHit}</p>
                </motion.div>
              </div>

              {/* Extended Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-900 border border-red-900 p-3 space-y-1">
                  <p className="text-xs text-gray-500 font-mono">Top Rug</p>
                  <p className="text-sm font-black text-red-500">{walletStats.topRug}</p>
                </div>
                <div className="bg-zinc-900 border border-red-900 p-3 space-y-1">
                  <p className="text-xs text-gray-500 font-mono">Avg Loss</p>
                  <p className="text-sm font-black text-red-500">{walletStats.averageLossPerTrade} SOL</p>
                </div>
              </div>

              {/* Status */}
              <motion.div
                animate={{ rotate: [-1, 1, -1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-gradient-to-r from-red-950 to-zinc-900 border-2 border-red-500 p-4 text-center space-y-2"
              >
                <p className="text-xs text-gray-400 font-mono">STATUS</p>
                <p className="text-3xl font-black text-red-500 uppercase">{walletStats.status}</p>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-sm py-2 border-b-2 border-r-2 border-gray-300 uppercase"
              >
                Share This
              </motion.button>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div className="space-y-3">
                <AlertOctagon className="w-12 h-12 text-red-900 mx-auto opacity-50" />
                <p className="text-xs text-gray-600 font-mono">{connectedWallet ? "Click ANALYZE to scan your wallet" : "Connect your wallet to begin"}</p>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="mb-16 space-y-8">
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <TrendingUp className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">Tokens Launch Expensive</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              Forget the bonding curve. On Dum.fun, tokens start at an inflated price. The price only goes down from there.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">Village Idiot Leaderboard</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              We celebrate the fastest crashers. The coin losing money the quickest gets the spotlight. It's a leaderboard of failure.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <Zap className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">Live Chaos</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              Watch prices plummet in real-time. Chat erupts. Animations go haywire. Every crash is a spectacle.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <DollarSign className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">Catch the Knife</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              Buy on the way down. The button shakes menacingly. Take the risk. Lose the money.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Concept */}
      <section className="border-2 border-red-500 bg-black p-12 mb-16 space-y-6">
        <h2 className="text-4xl font-black uppercase text-red-500">The Concept</h2>
        <div className="space-y-4 text-gray-300 font-mono leading-relaxed">
          <p>
            Pump.fun made creating tokens a game where anyone could get rich quick. Dum.fun is the same thing, but we're not pretending it's anything other than what it is: a satirical mirror of crypto degen culture.
          </p>
          <p>
            On Dum.fun, we flip the script. Tokens launch expensive. Prices can only drop. The UI is intentionally chaotic. It's brutally honest about the industry's absurdity.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border border-red-900 bg-zinc-900 p-8 text-center">
        <p className="text-gray-400 font-mono text-sm">
          This is a design concept and interactive mockup. Dum.fun is not a real product. All data is simulated for demonstration purposes only.
        </p>
      </section>
    </Layout>
  );
}
