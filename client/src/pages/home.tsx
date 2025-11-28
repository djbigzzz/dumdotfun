import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Zap, DollarSign, Flame, Radar, Send } from "lucide-react";

interface Post {
  id: number;
  user: string;
  message: string;
  solBurned: number;
  timestamp: Date;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<Post[]>([
    { id: 1, user: "degen_420", message: "the only way is down", solBurned: 0.01, timestamp: new Date(Date.now() - 60000) },
    { id: 2, user: "hodler_99", message: "this is gentlemen", solBurned: 0.02, timestamp: new Date(Date.now() - 30000) },
    { id: 3, user: "paper_hands", message: "why did i buy this", solBurned: 0.01, timestamp: new Date(Date.now() - 10000) },
  ]);
  
  const [messageText, setMessageText] = useState("");
  const [currentSolPrice, setCurrentSolPrice] = useState(0.01);

  const enterDemoMode = () => {
    setLocation("/demo");
  };

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

  return (
    <Layout>
      {/* The Dum Wall - Real Interactive Section */}
      <section className="mb-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Wall Feed */}
          <div className="lg:col-span-2">
            <div className="border-2 border-red-500 bg-zinc-900 min-h-[600px] flex flex-col">
              {/* Header */}
              <div className="bg-red-900/40 border-b-2 border-red-500 p-4">
                <div className="flex items-center gap-3">
                  <Flame className="w-6 h-6 text-red-500 animate-bounce" />
                  <h2 className="text-2xl font-black uppercase text-gray-100">THE DUM WALL</h2>
                  <span className="text-xs font-mono text-gray-500 ml-auto">{posts.length} POSTS</span>
                </div>
                <p className="text-gray-400 font-mono text-sm mt-2">Burn SOL to post. Higher burn = higher visibility. Share your pain.</p>
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
            </div>
          </div>

          {/* Burn Box */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="border-2 border-red-500 bg-black p-6 space-y-6 h-[600px] flex flex-col sticky top-20"
            >
              <div>
                <h3 className="text-red-500 font-black uppercase text-sm mb-4">BURN & POST</h3>
              </div>

              {/* Message Input */}
              <div className="flex-1 flex flex-col space-y-3">
                <label className="text-xs font-mono text-gray-400 uppercase">Your Message</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Share your losses, pain, or wisdom..."
                  className="flex-1 bg-zinc-950 border border-red-900 p-3 font-terminal text-sm text-gray-300 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              {/* SOL Price Display */}
              <div className="border border-red-900 bg-zinc-950 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-gray-400">BURN AMOUNT:</span>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-2xl font-black text-red-500 font-mono"
                  >
                    {currentSolPrice.toFixed(4)} ◎
                  </motion.div>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  (Doubles after each post)
                </div>
              </div>

              {/* Burn Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBurnPost}
                disabled={!messageText.trim()}
                className={`w-full font-black uppercase py-4 border-b-4 border-r-4 transition-all flex items-center justify-center gap-2 ${
                  messageText.trim()
                    ? "bg-red-500 hover:bg-red-600 text-white border-gray-300 cursor-pointer"
                    : "bg-zinc-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50"
                }`}
              >
                <Flame className="w-5 h-5" />
                BURN & POST
              </motion.button>

              {/* Stats */}
              <div className="text-xs text-gray-500 font-mono text-center border-t border-red-900 pt-3">
                <p>{posts.length} Messages Burned</p>
                <p className="text-red-600">
                  {(posts.reduce((sum, p) => sum + p.solBurned, 0)).toFixed(2)} SOL Destroyed
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform Explanation */}
      <section className="mb-16 space-y-8">
        {/* See Demo CTA */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-4xl md:text-5xl font-black uppercase text-gray-100">
            Want to see the <span className="text-red-500">full experience?</span>
          </h2>
          <motion.button
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            onClick={enterDemoMode}
            className="mx-auto bg-red-500 hover:bg-red-600 text-white font-black text-2xl px-12 py-6 border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] transition-all uppercase"
          >
            SEE THE PLATFORM
          </motion.button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <TrendingUp className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">Tokens Launch Expensive</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              Forget the bonding curve. On Dum.fun, tokens start at an inflated price. The price only goes down from there. It's the opposite of the "race to the top"—it's a race to zero.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">The Village Idiot Leaderboard</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              Instead of a "King of the Hill," we celebrate the fastest crashers. The coin losing money the quickest gets the spotlight. It's a leaderboard of failure.
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="border border-red-500 bg-zinc-900 p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <Zap className="w-10 h-10 text-red-500 flex-shrink-0" />
              <h3 className="text-2xl font-black uppercase text-gray-100">Live Chaos & Analytics</h3>
            </div>
            <p className="text-gray-400 font-mono leading-relaxed">
              Watch prices plummet in real-time. Chat erupts. Screen cracks. Animations go haywire. Every crash is a spectacle. Every sell is a screaming panic.
            </p>
          </motion.div>

          {/* Feature 4 */}
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
              Buy on the way down. The button is massive and shakes menacingly. Take the risk. Lose the money. That's the Dum.fun experience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The Dum Analyzer Section */}
      <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="border-2 border-red-500 bg-black p-8 md:p-12"
        >
          <div className="bg-gradient-to-br from-red-950 to-zinc-900 border border-red-900 p-6 space-y-4 font-terminal">
            <div className="text-xs font-mono text-red-500 uppercase">Wallet Analysis</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Dum Score:</span>
                <span className="text-red-500 font-black">9999</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SOL Lost:</span>
                <span className="text-red-500 font-black">47.3 SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rugs Hit:</span>
                <span className="text-red-500 font-black">12</span>
              </div>
              <div className="flex justify-between text-sm mt-4 pt-4 border-t border-red-900">
                <span className="text-gray-500">Status:</span>
                <span className="text-yellow-500 animate-pulse">PERMA-REKT</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="border-2 border-red-500 bg-zinc-900 p-8 md:p-12 space-y-6"
        >
          <div className="flex items-center gap-4">
            <Radar className="w-12 h-12 text-red-500 flex-shrink-0 animate-spin" style={{ animationDuration: "3s" }} />
            <h3 className="text-3xl font-black uppercase text-gray-100">The Dum Analyzer</h3>
          </div>
          <p className="text-gray-400 font-mono leading-relaxed text-lg">
            Analyze any wallet's Dum Score. See how much SOL they've lost, rugs they've hit, and share their pain. Compare portfolios. Celebrate failures. The lower the score, the higher the achievement.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation("/analyzer")}
            className="bg-red-500 hover:bg-red-600 text-white font-black text-lg px-6 py-3 border-2 border-white transition-all uppercase"
          >
            Analyze a Wallet
          </motion.button>
        </motion.div>
      </section>

      {/* The Concept */}
      <section className="border-2 border-red-500 bg-black p-12 mb-16 space-y-6">
        <h2 className="text-4xl font-black uppercase text-red-500">The Concept</h2>
        <div className="space-y-4 text-gray-300 font-mono leading-relaxed">
          <p>
            Pump.fun made creating tokens a game where anyone could get rich quick. Dum.fun is the same thing, but we're not pretending it's anything other than what it is: a satirical mirror of crypto degen culture.
          </p>
          <p>
            On Dum.fun, we flip the script. Tokens launch expensive. Prices can only drop. The UI is intentionally chaotic. Buttons shake. Charts crash. Chats scream. It's brutally honest about the industry's absurdity.
          </p>
          <p>
            This is a design mockup and celebration of the Neo-Brutalist aesthetic applied to crypto. Come see it in action.
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border border-red-900 bg-zinc-900 p-8 text-center">
        <p className="text-gray-400 font-mono text-sm">
          This is a design concept and interactive mockup. Dum.fun is not a real product. Tokens, wallets, and transactions shown are simulated for demonstration purposes only. Do not actually try to get rich here—you will lose money. (You'll lose money on Pump.fun too, but at least the UI won't judge you for it.)
        </p>
      </section>
    </Layout>
  );
}
