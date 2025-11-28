import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { DoomChart } from "@/components/doom-chart";
import { MOCK_TOKENS, generateDoomData } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Skull, TrendingDown, TrendingUp, X, AlertOctagon } from "lucide-react";

const DEMO_MESSAGES = [
  { user: "PaperHands", msg: "WHY IS IT DROPPING???", color: "text-red-500" },
  { user: "Chad_69", msg: "Just bought the dip (I'm ruined)", color: "text-green-500" },
  { user: "Dev", msg: "Dev is sleeping (actually selling)", color: "text-yellow-600" },
  { user: "HODLER_420", msg: "This one's different!", color: "text-green-400" },
  { user: "Victim_99", msg: "HODL STRONG", color: "text-green-600" },
  { user: "FUD_Spreader", msg: "Actually solid fundamentals", color: "text-yellow-500" },
];

// Token states for demo
const DEMO_TOKENS = [
  { ...MOCK_TOKENS[0], demoStatus: "crashing", trend: "down" },
  { ...MOCK_TOKENS[1], demoStatus: "rugged", trend: "down" },
  { ...MOCK_TOKENS[2], demoStatus: "stable", trend: "up" },
  { ...MOCK_TOKENS[3], demoStatus: "dead", trend: "none" },
  { ...MOCK_TOKENS[4], demoStatus: "crashing", trend: "down" },
  { ...MOCK_TOKENS[5], demoStatus: "stable", trend: "up" },
];

export default function Demo() {
  const [selectedToken, setSelectedToken] = useState(DEMO_TOKENS[2]); // Start with the stable one
  const [chartData, setChartData] = useState(generateDoomData());
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [messageIndex, setMessageIndex] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [cracked, setCracked] = useState(false);

  // Chart updates
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const last = prev[prev.length - 1];
        let newPrice;

        if (selectedToken.trend === "down") {
          const drop = Math.random() * 6;
          const pump = Math.random() > 0.7 ? Math.random() * 8 : 0;
          newPrice = Math.max(0, last.price - drop + pump);
          if (pump > 5) {
            setShaking(true);
            setTimeout(() => setShaking(false), 200);
          } else if (drop > 4.5) {
            setCracked(true);
            setTimeout(() => setCracked(false), 300);
          }
        } else {
          const rise = Math.random() * 3;
          const dip = Math.random() > 0.85 ? Math.random() * 1 : 0;
          newPrice = last.price + rise - dip;
        }

        const newData = [...prev.slice(1), { time: last.time + 1, price: newPrice }];
        return newData;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [selectedToken.trend]);

  // Chat messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessages(prev => {
        const newMsg = DEMO_MESSAGES[messageIndex % DEMO_MESSAGES.length];
        const updated = [...prev, newMsg].slice(-6);
        setMessageIndex(i => i + 1);
        return updated;
      });
    }, 2000);
    return () => clearInterval(messageInterval);
  }, [messageIndex]);

  const handleTokenSelect = (token: any) => {
    setSelectedToken(token);
    setChartData(generateDoomData());
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

      {/* Token Grid - Main View */}
      <section className="mb-12">
        <div className="flex justify-between items-end mb-6 border-b border-red-900 pb-2">
          <h2 className="text-2xl text-gray-400 font-mono">
            LIVE TOKENS ({DEMO_TOKENS.length})
          </h2>
          <p className="text-xs text-gray-500 font-mono">
            Click any token to see details →
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {DEMO_TOKENS.map((token) => {
            const isSelected = selectedToken.id === token.id;
            const isUp = token.trend === "up";
            return (
              <motion.button
                key={token.id}
                onClick={() => handleTokenSelect(token)}
                whileHover={{ scale: 1.02, rotate: Math.random() * 1 - 0.5 }}
                className={`
                  relative p-4 border text-left cursor-pointer group overflow-hidden transition-all
                  ${isSelected 
                    ? "ring-2 ring-offset-2 ring-offset-zinc-950 " + (isUp ? "ring-green-500" : "ring-red-500")
                    : ""
                  }
                  ${isUp ? "border-green-900 bg-zinc-900 hover:border-green-500" : "border-red-900 bg-zinc-900 hover:border-red-500"}
                `}
              >
                {token.demoStatus === "rugged" && (
                  <div className="absolute -top-2 -right-2 bg-red-600 text-white font-bold px-2 py-1 text-xs rotate-12 z-20 border border-white animate-bounce">
                    RUGGED!
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img 
                      src={token.imageUrl} 
                      alt={token.name} 
                      className={`w-20 h-20 object-cover border border-gray-500 grayscale contrast-125 group-hover:grayscale-0 transition-all`} 
                    />
                    {token.demoStatus === "dead" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Skull className={`w-10 h-10 ${isUp ? "text-green-500" : "text-red-500"}`} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black uppercase truncate text-gray-100 group-hover:text-yellow-400">
                      {token.name}
                    </h3>
                    <p className="font-mono text-sm text-gray-500 mb-2">{token.ticker}</p>
                    
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cap:</span>
                        <span className={isUp ? "text-green-500" : "text-red-500"}>
                          ${token.marketCap}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Trend:</span>
                        <span className={`font-bold ${isUp ? "text-green-500" : "text-red-500"}`}>
                          {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glitch overlay on hover */}
                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mix-blend-overlay" />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Selected Token Detail */}
      <section className={`${shaking ? "animate-shake" : ""}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <motion.div
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className={`border p-6 relative overflow-hidden ${
                selectedToken.trend === "up" ? "bg-zinc-900 border-green-900" : "bg-zinc-900 border-red-900"
              }`}
            >
              <div className="flex items-center gap-6 relative z-10">
                <img src={selectedToken.imageUrl} className="w-24 h-24 border border-gray-300" alt={selectedToken.name} />
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-gray-100 uppercase leading-none">
                    {selectedToken.name}
                  </h1>
                  <p className="text-lg text-gray-500 font-mono mt-1">{selectedToken.ticker}</p>
                  
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`flex items-center gap-2 mt-3 font-mono font-bold text-sm ${
                      selectedToken.trend === "up" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {selectedToken.trend === "up" ? (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        <span>Market Cap: $156,450</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-5 h-5" />
                        <span>Market Cap: ${selectedToken.marketCap}</span>
                      </>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Chart */}
            <div className={`border bg-zinc-950 p-1 relative group ${
              selectedToken.trend === "up" ? "border-green-600" : "border-red-500"
            }`}>
              <div className={`absolute top-2 left-2 z-10 px-2 font-black text-xs animate-pulse ${
                selectedToken.trend === "up" ? "bg-green-600 text-white" : "bg-red-500 text-white"
              }`}>
                {selectedToken.trend === "up" ? "📈 RISING" : "📉 FALLING"}
              </div>
              <DoomChart data={chartData} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`bg-zinc-900 p-4 border ${
                selectedToken.trend === "up" ? "border-green-900" : "border-red-900"
              }`}>
                <h3 className="text-gray-400 font-mono mb-2 text-sm">HOLDERS</h3>
                <p className={`text-2xl font-mono font-black ${selectedToken.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {selectedToken.trend === "up" ? "2,847" : "420"}
                </p>
              </div>

              <div className={`bg-zinc-900 p-4 border ${
                selectedToken.trend === "up" ? "border-green-900" : "border-red-900"
              }`}>
                <h3 className="text-gray-400 font-mono mb-2 text-sm">VOLUME (24H)</h3>
                <p className={`text-2xl font-mono font-black ${selectedToken.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {selectedToken.trend === "up" ? "$45.2K" : "$2.1K"}
                </p>
              </div>

              <div className={`bg-zinc-900 p-4 border ${
                selectedToken.trend === "up" ? "border-green-900" : "border-red-900"
              }`}>
                <h3 className="text-gray-400 font-mono mb-2 text-sm">POTENTIAL</h3>
                <p className={`text-2xl font-mono font-black ${selectedToken.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {selectedToken.trend === "up" ? "+340%" : "-95%"}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              animate={selectedToken.trend === "up" 
                ? { scale: [1, 1.02, 1], y: [0, -2, 0] }
                : { scale: [1, 1.02, 1], y: [-2, 0, -2] }
              }
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-full font-black text-4xl md:text-5xl py-8 border-b-8 border-r-8 border-gray-300 transition-all relative overflow-hidden group cursor-pointer ${
                selectedToken.trend === "up"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              <span className="relative z-10 uppercase">
                {selectedToken.trend === "up" ? "BUY & HODL" : "CATCH THE KNIFE"}
              </span>
              <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />
            </motion.button>
          </div>

          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              animate={{ borderColor: selectedToken.trend === "up" ? ["#15803D", "#22C55E", "#15803D"] : ["#7F1D1D", "#DC2626", "#7F1D1D"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`bg-zinc-950 border h-[400px] md:h-[600px] flex flex-col`}
            >
              <div className={`p-2 border-b ${
                selectedToken.trend === "up" ? "bg-green-900/20 border-green-900" : "bg-red-900/20 border-red-900"
              }`}>
                <h3 className="text-gray-300 font-terminal text-sm md:text-base">LIVE CHAT</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-1 font-terminal text-xs md:text-base">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="break-words"
                  >
                    <span className="text-gray-600">[</span>
                    <span className="text-gray-400 font-bold">{msg.user}</span>
                    <span className="text-gray-600">]</span>
                    <span className={`${msg.color} ml-2`}>{msg.msg}</span>
                  </motion.div>
                ))}
              </div>

              <div className={`p-2 border-t ${
                selectedToken.trend === "up" ? "bg-zinc-900 border-green-900" : "bg-zinc-900 border-red-900"
              }`}>
                <input 
                  type="text" 
                  placeholder="Type here..."
                  className={`w-full bg-zinc-950 border p-2 font-terminal text-xs focus:outline-none ${
                    selectedToken.trend === "up" 
                      ? "border-green-900 text-green-400 focus:border-green-500"
                      : "border-red-900 text-red-400 focus:border-red-500"
                  }`}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

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
