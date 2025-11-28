import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Zap, DollarSign, Flame, Radar } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  const enterDemoMode = () => {
    setLocation("/demo");
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="min-h-[70vh] flex flex-col justify-center items-center text-center mb-16 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <h1 className="text-6xl md:text-8xl font-black text-red-500 uppercase leading-tight" style={{ textShadow: "3px 3px 0px hsl(60 100% 50%)" }}>
            DUM.FUN
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 font-mono">
            The Opposite of Pump.fun
          </p>
          <p className="text-lg text-gray-400 font-mono max-w-2xl mx-auto">
            Where tokens launch EXPENSIVE and crash IMMEDIATELY
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          onClick={enterDemoMode}
          className="mt-12 bg-red-500 hover:bg-red-600 text-white font-black text-2xl px-12 py-6 border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] transition-all uppercase"
        >
          SEE IT IN ACTION
        </motion.button>
      </section>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
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
      </section>

      {/* The Dum Wall */}
      <section className="mb-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="border-2 border-red-500 bg-zinc-900 p-8 md:p-12 space-y-6 order-2 md:order-1"
        >
          <div className="flex items-center gap-4">
            <Flame className="w-12 h-12 text-red-500 flex-shrink-0 animate-bounce" />
            <h3 className="text-3xl font-black uppercase text-gray-100">The Dum Wall</h3>
          </div>
          <p className="text-gray-400 font-mono leading-relaxed text-lg">
            Burn SOL to post messages on our viral masonry grid. Compete for attention by burning more than others. Watch your message climb as your SOL burns. The hotter your take, the hotter your flame.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-red-500 hover:bg-red-600 text-white font-black text-lg px-6 py-3 border-2 border-white transition-all uppercase"
          >
            Start Burning
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="border-2 border-red-500 bg-black p-8 md:p-12 order-1 md:order-2"
        >
          <div className="bg-gradient-to-br from-red-950 to-zinc-900 border border-red-900 p-6 space-y-3">
            <div className="text-xs font-mono text-red-500 uppercase">Live Wall Feed</div>
            <div className="space-y-3 font-terminal text-sm">
              <div className="border-l-4 border-red-500 pl-3">
                <div className="text-yellow-500 font-bold">hodler_99 burned 5 SOL</div>
                <div className="text-gray-400">"this is gentlemen"</div>
              </div>
              <div className="border-l-4 border-red-600 pl-3">
                <div className="text-yellow-600 font-bold">degen_420 burned 12 SOL</div>
                <div className="text-gray-400">"the only way is down"</div>
              </div>
              <div className="border-l-4 border-red-700 pl-3">
                <div className="text-yellow-700 font-bold">paper_hands burned 3 SOL</div>
                <div className="text-gray-400">"why did i buy this"</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* The Dum Analyzer */}
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

      {/* Call to Action */}
      <section className="text-center space-y-6 mb-16">
        <h2 className="text-4xl md:text-5xl font-black uppercase text-gray-100">
          Ready for the <span className="text-red-500">Descent?</span>
        </h2>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={enterDemoMode}
          className="mx-auto bg-red-500 hover:bg-red-600 text-white font-black text-2xl px-16 py-8 border-4 border-white shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] transition-all uppercase"
        >
          Enter Demo Mode
        </motion.button>
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
