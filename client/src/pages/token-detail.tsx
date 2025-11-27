import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { DoomChart } from "@/components/doom-chart";
import { MOCK_TOKENS, generateDoomData, CHAT_MESSAGES } from "@/lib/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, TrendingDown, AlertTriangle } from "lucide-react";
import brokenGlass from "@assets/generated_images/transparent_cracked_screen_overlay_texture.png";

export default function TokenDetail() {
  const [, params] = useRoute("/token/:id");
  const id = params?.id;
  const token = MOCK_TOKENS.find(t => t.id === id) || MOCK_TOKENS[0];
  
  const [chartData, setChartData] = useState(generateDoomData());
  const [shaking, setShaking] = useState(false);
  const [cracked, setCracked] = useState(false);
  const [messages, setMessages] = useState(CHAT_MESSAGES);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const last = prev[prev.length - 1];
        const drop = Math.random() * 5;
        const pump = Math.random() > 0.8 ? Math.random() * 8 : 0; // Occasional pump
        const newPrice = Math.max(0, last.price - drop + pump);
        const newData = [...prev.slice(1), { time: last.time + 1, price: newPrice }];
        
        // Trigger effects
        if (pump > 5) {
          // Buy effect
          setShaking(true);
          setTimeout(() => setShaking(false), 200);
        } else if (drop > 4) {
          // Sell effect (crack)
          setCracked(true);
          setTimeout(() => setCracked(false), 300);
        }

        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${shaking ? "animate-shake" : ""}`}>
        {/* Main Chart & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 relative overflow-hidden">
            {cracked && (
              <img 
                src={brokenGlass} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none z-50 mix-blend-overlay" 
                alt=""
              />
            )}
            
            <div className="flex items-center gap-6 relative z-10">
              <img src={token.imageUrl} className="w-24 h-24 border-2 border-white" alt={token.name} />
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase leading-none">
                  {token.name} <span className="text-neutral-600 text-2xl block md:inline">{token.ticker}</span>
                </h1>
                <div className="flex items-center gap-2 mt-2 text-red-500 font-mono font-bold">
                  <TrendingDown className="w-5 h-5" />
                  <span>MARKET CAP: ${token.marketCap.toFixed(2)} (DROPPING FAST)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="border-4 border-red-600 bg-black p-1 relative group">
            <div className="absolute top-2 left-2 z-10 bg-red-600 text-black px-2 font-black text-xs">
              LIVE FAILURE FEED
            </div>
            <DoomChart data={chartData} />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-900 p-4 border-2 border-neutral-800">
              <h3 className="text-green-500 font-mono mb-2">DEV HOLDINGS</h3>
              <p className="text-2xl font-mono text-white">0% (SOLD EVERYTHING)</p>
            </div>
            <div className="bg-neutral-900 p-4 border-2 border-neutral-800">
              <h3 className="text-green-500 font-mono mb-2">HOLDER COUNT</h3>
              <p className="text-2xl font-mono text-white">420 (TRAPPED)</p>
            </div>
          </div>

          {/* THE BIG BUTTON */}
          <motion.button
            whileHover={{ scale: 1.05, x: [0, -5, 5, -5, 5, 0] }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-red-600 hover:bg-red-500 text-black font-black text-4xl md:text-6xl py-8 border-b-8 border-r-8 border-white active:border-0 active:translate-y-2 active:translate-x-2 transition-all relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-4">
              <Skull className="w-12 h-12 animate-bounce" />
              CATCH THE KNIFE
              <Skull className="w-12 h-12 animate-bounce" />
            </span>
            {/* Warning stripes background */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />
          </motion.button>
        </div>

        {/* Sidebar / Chat */}
        <div className="lg:col-span-1">
          <div className="bg-black border-2 border-green-900 h-[600px] flex flex-col">
            <div className="bg-green-900/20 p-2 border-b border-green-900">
              <h3 className="text-green-500 font-terminal text-xl">THE SCREAM CHAMBER (IRC)</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-terminal text-lg">
              {messages.map((msg, i) => (
                <div key={i} className="break-words animate-in slide-in-from-left-2 duration-300">
                  <span className="text-neutral-500">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-neutral-300 font-bold"> &lt;{msg.user}&gt; </span>
                  <span className={msg.color}>{msg.msg}</span>
                </div>
              ))}
              <div className="text-neutral-600 text-sm italic mt-4">
                * System: Liquidity pool drained...
              </div>
            </div>

            <div className="p-2 border-t border-green-900 bg-neutral-900">
              <input 
                type="text" 
                placeholder="SCREAM INTO THE VOID..." 
                className="w-full bg-black border border-green-900 text-green-500 p-2 font-terminal focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
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
