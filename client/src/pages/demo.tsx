import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { DoomChart } from "@/components/doom-chart";
import { MOCK_TOKENS, generateDoomData } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Skull, TrendingDown, X } from "lucide-react";
import brokenGlass from "@assets/generated_images/transparent_cracked_screen_overlay_texture.png";

const DEMO_MESSAGES = [
  { user: "PaperHands", msg: "WHY IS IT DROPPING???", color: "text-red-500" },
  { user: "Chad_69", msg: "Just bought the dip (I'm ruined)", color: "text-green-500" },
  { user: "Dev", msg: "Dev is sleeping (actually selling)", color: "text-yellow-600" },
  { user: "Bot_123", msg: "SELLING...", color: "text-gray-500" },
  { user: "Victim_99", msg: "My wife left me", color: "text-red-500" },
  { user: "HODLER_420", msg: "TO THE MOON! 🚀", color: "text-green-400" },
  { user: "FUD_Spreader", msg: "THIS IS A RUG PULL", color: "text-red-600" },
  { user: "Mod", msg: "[Banned FUD_Spreader]", color: "text-yellow-500" },
];

export default function Demo() {
  const token = MOCK_TOKENS[0];
  const [chartData, setChartData] = useState(generateDoomData());
  const [shaking, setShaking] = useState(false);
  const [cracked, setCracked] = useState(false);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [messageIndex, setMessageIndex] = useState(0);

  // Aggressive demo animations
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const last = prev[prev.length - 1];
        const drop = Math.random() * 6;
        const pump = Math.random() > 0.7 ? Math.random() * 12 : 0;
        const newPrice = Math.max(0, last.price - drop + pump);
        const newData = [...prev.slice(1), { time: last.time + 1, price: newPrice }];
        
        if (pump > 7) {
          setShaking(true);
          setTimeout(() => setShaking(false), 300);
        } else if (drop > 4.5) {
          setCracked(true);
          setTimeout(() => setCracked(false), 400);
        }

        return newData;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Add messages to chat
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessages(prev => {
        const newMsg = DEMO_MESSAGES[messageIndex % DEMO_MESSAGES.length];
        const updated = [...prev, newMsg].slice(-8);
        setMessageIndex(i => i + 1);
        return updated;
      });
    }, 2000);
    return () => clearInterval(messageInterval);
  }, [messageIndex]);

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

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${shaking ? "animate-shake" : ""}`}>
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="bg-zinc-900 border border-red-900 p-6 relative overflow-hidden"
          >
            {cracked && (
              <img 
                src={brokenGlass} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none z-50 mix-blend-overlay animate-pulse" 
                alt=""
              />
            )}
            
            <div className="flex items-center gap-6 relative z-10">
              <img src={token.imageUrl} className="w-24 h-24 border border-gray-300" alt={token.name} />
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-gray-100 uppercase leading-none">
                  {token.name} <span className="text-gray-600 text-2xl block md:inline">{token.ticker}</span>
                </h1>
                <motion.div
                  animate={{ color: ["#EF4444", "#DC2626", "#EF4444"] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="flex items-center gap-2 mt-2 font-mono font-bold text-sm"
                >
                  <TrendingDown className="w-5 h-5" />
                  <span>MARKET CAP: ${token.marketCap.toFixed(2)} (DROPPING FAST)</span>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Chart */}
          <div className="border border-red-500 bg-zinc-950 p-1 relative group">
            <div className="absolute top-2 left-2 z-10 bg-red-500 text-white px-2 font-black text-xs animate-pulse">
              LIVE FAILURE FEED
            </div>
            <DoomChart data={chartData} />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              animate={{ borderColor: ["#7F1D1D", "#DC2626", "#7F1D1D"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-zinc-900 p-4 border"
            >
              <h3 className="text-gray-400 font-mono mb-2">DEV HOLDINGS</h3>
              <p className="text-2xl font-mono text-gray-100">0% (SOLD EVERYTHING)</p>
            </motion.div>
            <motion.div
              animate={{ borderColor: ["#7F1D1D", "#DC2626", "#7F1D1D"] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              className="bg-zinc-900 p-4 border"
            >
              <h3 className="text-gray-400 font-mono mb-2">HOLDER COUNT</h3>
              <p className="text-2xl font-mono text-gray-100">420 (TRAPPED)</p>
            </motion.div>
          </div>

          {/* THE BIG BUTTON */}
          <motion.button
            animate={{ scale: [1, 1.02, 1], y: [-2, 0, -2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-4xl md:text-6xl py-8 border-b-8 border-r-8 border-gray-300 active:border-0 active:translate-y-2 active:translate-x-2 transition-all relative overflow-hidden group cursor-pointer"
          >
            <span className="relative z-10 flex items-center justify-center gap-4">
              <Skull className="w-12 h-12 animate-bounce" />
              CATCH THE KNIFE
              <Skull className="w-12 h-12 animate-bounce" />
            </span>
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />
          </motion.button>
        </div>

        {/* Sidebar / Chat */}
        <div className="lg:col-span-1">
          <motion.div
            animate={{ borderColor: ["#7F1D1D", "#DC2626", "#7F1D1D"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-zinc-950 border h-[600px] flex flex-col"
          >
            <div className="bg-red-900/20 p-2 border-b border-red-900">
              <h3 className="text-gray-300 font-terminal text-xl">THE SCREAM CHAMBER (IRC)</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-terminal text-lg">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="break-words"
                >
                  <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-gray-400 font-bold"> &lt;{msg.user}&gt; </span>
                  <span className={msg.color}>{msg.msg}</span>
                </motion.div>
              ))}
              <div className="text-gray-700 text-sm italic mt-4 animate-pulse">
                * System: Liquidity pool drained...
              </div>
            </div>

            <div className="p-2 border-t border-red-900 bg-zinc-900">
              <input 
                type="text" 
                placeholder="SCREAM INTO THE VOID..." 
                className="w-full bg-zinc-950 border border-red-900 text-gray-300 p-2 font-terminal focus:outline-none focus:border-red-500"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-5px, 5px) rotate(-1deg); }
          75% { transform: translate(5px, -5px) rotate(1deg); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out infinite;
        }
      `}</style>
    </Layout>
  );
}
