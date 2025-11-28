import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { DoomChart } from "@/components/doom-chart";
import { MOCK_TOKENS, generateDoomData } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Skull, TrendingDown, TrendingUp, X, Award } from "lucide-react";
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
  const crashingToken = MOCK_TOKENS[0];
  const winnerToken = MOCK_TOKENS[2]; // A "successful" token
  
  const [chartData, setChartData] = useState(generateDoomData());
  const [winnerChartData, setWinnerChartData] = useState(generateWinnerData());
  const [shaking, setShaking] = useState(false);
  const [cracked, setCracked] = useState(false);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [messageIndex, setMessageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"crash" | "winner">("crash");

  function generateWinnerData(points = 50) {
    let data = [];
    let price = 10;
    for (let i = 0; i < points; i++) {
      // Trend UPWARDS for winner
      const rise = Math.random() * 3;
      const dip = Math.random() > 0.85 ? Math.random() * 2 : 0;
      price = price + rise - dip;
      if (price < 10) price = 10;
      
      data.push({ time: i, price });
    }
    return data;
  }

  // Aggressive demo animations for crashing token
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

  // Winner chart going UP
  useEffect(() => {
    const interval = setInterval(() => {
      setWinnerChartData(prev => {
        const last = prev[prev.length - 1];
        const rise = Math.random() * 2;
        const dip = Math.random() > 0.85 ? Math.random() * 0.5 : 0;
        const newPrice = Math.max(10, last.price + rise - dip);
        const newData = [...prev.slice(1), { time: last.time + 1, price: newPrice }];
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

  const isCrashMode = activeTab === "crash";
  const displayToken = isCrashMode ? crashingToken : winnerToken;
  const displayChartData = isCrashMode ? chartData : winnerChartData;

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

      {/* Tab Toggle */}
      <div className="mb-8 flex gap-4 justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setActiveTab("crash")}
          className={`px-8 py-3 font-black uppercase border-2 transition-all ${
            isCrashMode
              ? "bg-red-500 text-white border-white"
              : "bg-zinc-900 text-gray-400 border-red-500"
          }`}
        >
          <TrendingDown className="inline w-5 h-5 mr-2" />
          The Crash
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => setActiveTab("winner")}
          className={`px-8 py-3 font-black uppercase border-2 transition-all ${
            !isCrashMode
              ? "bg-green-600 text-white border-white"
              : "bg-zinc-900 text-gray-400 border-green-600"
          }`}
        >
          <Award className="inline w-5 h-5 mr-2" />
          The Winner
        </motion.button>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${shaking && isCrashMode ? "animate-shake" : ""}`}>
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className={`border p-6 relative overflow-hidden ${
              isCrashMode ? "bg-zinc-900 border-red-900" : "bg-zinc-900 border-green-900"
            }`}
          >
            {cracked && isCrashMode && (
              <img 
                src={brokenGlass} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none z-50 mix-blend-overlay animate-pulse" 
                alt=""
              />
            )}
            
            <div className="flex items-center gap-6 relative z-10">
              <img src={displayToken.imageUrl} className="w-24 h-24 border border-gray-300" alt={displayToken.name} />
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-gray-100 uppercase leading-none">
                  {displayToken.name} <span className="text-gray-600 text-2xl block md:inline">{displayToken.ticker}</span>
                </h1>
                <motion.div
                  animate={{ color: isCrashMode ? ["#EF4444", "#DC2626", "#EF4444"] : ["#22C55E", "#16A34A", "#22C55E"] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className={`flex items-center gap-2 mt-2 font-mono font-bold text-sm ${isCrashMode ? "text-red-500" : "text-green-500"}`}
                >
                  {isCrashMode ? (
                    <>
                      <TrendingDown className="w-5 h-5" />
                      <span>MARKET CAP: ${displayToken.marketCap.toFixed(2)} (DROPPING FAST)</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      <span>MARKET CAP: $156,450 (RISING!)</span>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Chart */}
          <div className={`border bg-zinc-950 p-1 relative group ${
            isCrashMode ? "border-red-500" : "border-green-600"
          }`}>
            <div className={`absolute top-2 left-2 z-10 px-2 font-black text-xs animate-pulse ${
              isCrashMode ? "bg-red-500 text-white" : "bg-green-600 text-white"
            }`}>
              {isCrashMode ? "LIVE FAILURE FEED" : "LIVE SUCCESS FEED"}
            </div>
            <DoomChart data={displayChartData} />
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <motion.div
              animate={{ borderColor: isCrashMode ? ["#7F1D1D", "#DC2626", "#7F1D1D"] : ["#15803D", "#22C55E", "#15803D"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`bg-zinc-900 p-4 border ${isCrashMode ? "" : ""}`}
            >
              <h3 className="text-gray-400 font-mono mb-2 text-sm">DEV HOLDINGS</h3>
              <p className={`text-2xl font-mono font-black ${isCrashMode ? "text-red-500" : "text-green-500"}`}>
                {isCrashMode ? "0%" : "15%"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isCrashMode ? "(SOLD EVERYTHING)" : "(HOLDING STRONG)"}
              </p>
            </motion.div>

            <motion.div
              animate={{ borderColor: isCrashMode ? ["#7F1D1D", "#DC2626", "#7F1D1D"] : ["#15803D", "#22C55E", "#15803D"] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              className={`bg-zinc-900 p-4 border`}
            >
              <h3 className="text-gray-400 font-mono mb-2 text-sm">HOLDER COUNT</h3>
              <p className={`text-2xl font-mono font-black ${isCrashMode ? "text-red-500" : "text-green-500"}`}>
                {isCrashMode ? "420" : "2,847"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isCrashMode ? "(TRAPPED)" : "(GROWING)"}
              </p>
            </motion.div>

            <motion.div
              animate={{ borderColor: isCrashMode ? ["#7F1D1D", "#DC2626", "#7F1D1D"] : ["#15803D", "#22C55E", "#15803D"] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
              className={`bg-zinc-900 p-4 border`}
            >
              <h3 className="text-gray-400 font-mono mb-2 text-sm">PROFIT POTENTIAL</h3>
              <p className={`text-2xl font-mono font-black ${isCrashMode ? "text-red-500" : "text-green-500"}`}>
                {isCrashMode ? "-95%" : "+340%"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isCrashMode ? "(LOSS)" : "(GAIN)"}
              </p>
            </motion.div>
          </div>

          {/* The Button */}
          <motion.button
            animate={isCrashMode ? { scale: [1, 1.02, 1], y: [-2, 0, -2] } : { scale: [1, 1.01, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`w-full font-black text-4xl md:text-6xl py-8 border-b-8 border-r-8 transition-all relative overflow-hidden group cursor-pointer ${
              isCrashMode
                ? "bg-red-500 hover:bg-red-600 text-white border-gray-300"
                : "bg-green-600 hover:bg-green-700 text-white border-gray-300"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-4 uppercase">
              {isCrashMode ? (
                <>
                  <Skull className="w-12 h-12 animate-bounce" />
                  CATCH THE KNIFE
                  <Skull className="w-12 h-12 animate-bounce" />
                </>
              ) : (
                <>
                  <Award className="w-12 h-12 animate-bounce" />
                  BUY & HOLD
                  <Award className="w-12 h-12 animate-bounce" />
                </>
              )}
            </span>
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />
          </motion.button>
        </div>

        {/* Sidebar / Chat */}
        <div className="lg:col-span-1">
          <motion.div
            animate={{ borderColor: isCrashMode ? ["#7F1D1D", "#DC2626", "#7F1D1D"] : ["#15803D", "#22C55E", "#15803D"] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`bg-zinc-950 border h-[600px] flex flex-col`}
          >
            <div className={`p-2 border-b ${
              isCrashMode ? "bg-red-900/20 border-red-900" : "bg-green-900/20 border-green-900"
            }`}>
              <h3 className="text-gray-300 font-terminal text-xl">
                {isCrashMode ? "THE SCREAM CHAMBER (IRC)" : "THE VICTORY CHAT"}
              </h3>
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
              <div className={`text-sm italic mt-4 animate-pulse ${
                isCrashMode ? "text-gray-700" : "text-green-700"
              }`}>
                {isCrashMode 
                  ? "* System: Liquidity pool drained..."
                  : "* System: Community growing..."}
              </div>
            </div>

            <div className={`p-2 border-t ${
              isCrashMode ? "bg-zinc-900 border-red-900" : "bg-zinc-900 border-green-900"
            }`}>
              <input 
                type="text" 
                placeholder={isCrashMode ? "SCREAM INTO THE VOID..." : "CELEBRATE THE GAINS..."}
                className={`w-full bg-zinc-950 border p-2 font-terminal focus:outline-none ${
                  isCrashMode 
                    ? "border-red-900 text-gray-300 focus:border-red-500"
                    : "border-green-900 text-green-400 focus:border-green-500"
                }`}
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
