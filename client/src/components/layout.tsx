import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy, obfuscateWallet } from "@/lib/privacy-context";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, Lock, Unlock, Info, Shield } from "lucide-react";
import { toast } from "sonner";

import pillLogo from "@assets/Gemini_Generated_Image_ya5y9zya5y9zya5y_1764326352852.png";
import { PrivacyDrawer } from "./privacy-drawer";
import { MobileBottomNav } from "./mobile-bottom-nav";

const Marquee = () => {
  return (
    <div 
      className="py-2 overflow-hidden border-b-2 border-black relative bg-red-500"
    >
      <div className="flex items-center justify-center gap-2 animate-marquee whitespace-nowrap font-mono text-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-yellow-300 font-black">🚀 SOLANA DEVNET</span>
            <span className="text-pink-200">•</span>
            <span className="text-white font-black">REAL ON-CHAIN TOKENS</span>
            <span className="text-pink-200">•</span>
            <span className="text-pink-100">DEPLOY YOUR MEME TOKEN</span>
            <span className="text-pink-200">•</span>
            <span className="text-yellow-300 font-black">BET ON PREDICTIONS</span>
            <span className="text-pink-200 mx-2">•</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => Promise<void>;
}

const WalletModal = ({ isOpen, onClose, onConnect }: WalletModalProps) => {
  const { connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connectWallet();
      toast.success("Wallet connected!");
      onClose();
    } catch (err) {
      console.error("Connect error:", err);
      toast.error("Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 rounded-lg border border-red-600/50 max-w-sm w-full p-6 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-red-500">Connect Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <motion.button
          onClick={handleConnect}
          disabled={loading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black py-3 px-4 rounded-lg uppercase transition-all border border-red-400/50 disabled:opacity-50"
        >
          {loading ? "Connecting..." : "Phantom"}
        </motion.button>
        <p className="text-xs text-gray-400 font-mono text-center">
          Only Phantom supported for now
        </p>
      </motion.div>
    </div>
  );
};

const PrivacyToggle = ({ onOpenDrawer }: { onOpenDrawer: () => void }) => {
  const { privateMode, togglePrivateMode } = usePrivacy();
  
  return (
    <motion.button
      onClick={() => {
        togglePrivateMode();
        toast.success(privateMode ? "[ CHANNEL OPEN ]" : "[ ENCRYPTED CHANNEL ACTIVE ]", {
          style: privateMode ? {} : { background: '#0a0a0a', color: '#4ADE80', border: '1px solid #4ADE80', fontFamily: 'monospace' }
        });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenDrawer();
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex items-center gap-2 px-3 py-2 font-mono font-bold text-sm border-2 transition-all ${
        privateMode 
          ? "bg-black text-[#4ADE80] border-[#4ADE80] shadow-[0_0_10px_rgba(57,255,20,0.3)]" 
          : "bg-gray-100 text-gray-700 border-black hover:bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      }`}
      data-testid="button-privacy-toggle"
      title={privateMode ? "Disable encrypted mode" : "Enable encrypted mode"}
    >
      <AnimatePresence mode="wait">
        {privateMode ? (
          <motion.div
            key="private"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline tracking-wider">ENCRYPTED</span>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 bg-[#4ADE80] rounded-full"
            />
          </motion.div>
        ) : (
          <motion.div
            key="public"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span className="hidden sm:inline">PUBLIC</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { connectedWallet, connectWallet: contextConnect } = useWallet();
  const { privateMode } = usePrivacy();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showPrivacyDrawer, setShowPrivacyDrawer] = useState(false);
  const [showRefundJoke, setShowRefundJoke] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const fetchBalance = () => {
    if (connectedWallet) {
      fetch(`/api/devnet/balance/${connectedWallet}`)
        .then(res => res.json())
        .then(data => setSolBalance(data.balance))
        .catch(() => setSolBalance(null));
    }
  };

  useEffect(() => {
    if (connectedWallet) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    } else {
      setSolBalance(null);
    }
  }, [connectedWallet]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      privateMode 
        ? "bg-black text-gray-100 selection:bg-[#4ADE80] selection:text-black" 
        : "bg-gray-50 text-gray-900 selection:bg-red-500 selection:text-white"
    }`}>
      {privateMode && (
        <>
          <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(57,255,20,0.03)_0%,_transparent_70%)]" />
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.1) 2px, rgba(57,255,20,0.1) 4px)`
            }} />
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />
          </div>
          <div className="fixed top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#4ADE80]/5 to-transparent pointer-events-none z-10" />
          <style>{`
            @keyframes scanline {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100vh); }
            }
            .scanline-effect::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(to bottom, transparent, rgba(57,255,20,0.1), transparent);
              animation: scanline 8s linear infinite;
              pointer-events: none;
              z-index: 100;
            }
          `}</style>
        </>
      )}
      <div className="hidden md:block">
        <Marquee />
      </div>
      <header className={`p-3 md:p-4 border-b-2 flex justify-between items-center transition-colors duration-300 relative z-20 ${
        privateMode ? "bg-black/90 border-[#4ADE80]/30 backdrop-blur-sm" : "bg-white border-black"
      } ${privateMode ? "scanline-effect" : ""}`}>
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
              <img src={pillLogo} alt="DUM.FUN" className="h-10 md:h-12 w-auto" />
              <h1 className={`text-xl md:text-3xl font-black tracking-tighter uppercase hidden sm:block ${
                  privateMode ? "text-[#4ADE80] font-mono" : "text-red-500"
                }`} style={{ textShadow: privateMode ? "0 0 8px rgba(57,255,20,0.4)" : "2px 2px 0px hsl(60 100% 50%)" }}>
                DUM.FUN
              </h1>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/tokens">
              <span className={`font-bold transition-colors cursor-pointer ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80] font-mono" : "text-gray-700 hover:text-red-500"}`}>{privateMode ? "> TOKENS" : "Tokens"}</span>
            </Link>
            <Link href="/create">
              <span className={`font-bold transition-colors cursor-pointer ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80] font-mono" : "text-gray-700 hover:text-red-500"}`}>{privateMode ? "> DEPLOY" : "Launch"}</span>
            </Link>
            <Link href="/docs">
              <span className={`font-bold transition-colors cursor-pointer ${privateMode ? "text-[#00FFF0]/70 hover:text-[#00FFF0] font-mono" : "text-gray-700 hover:text-blue-500"}`}>{privateMode ? "> DOCS" : "Docs"}</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {privateMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-black border border-[#4ADE80] rounded-lg"
              style={{ boxShadow: "0 0 15px rgba(57,255,20,0.3)" }}
            >
              <Shield className="w-4 h-4 text-[#4ADE80]" />
              <span className="text-xs font-mono font-bold text-[#4ADE80]">SHIELDED</span>
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full"
              />
            </motion.div>
          )}
          <div className="flex items-center">
            <PrivacyToggle onOpenDrawer={() => setShowPrivacyDrawer(true)} />
            <button
              onClick={() => setShowPrivacyDrawer(true)}
              className={`p-2 -ml-1 transition-colors ${
                privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80]" : "text-gray-400 hover:text-gray-600"
              }`}
              title="View privacy features"
              data-testid="button-privacy-info"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
          {connectedWallet ? (
            <>
              <div className={`hidden sm:flex items-center gap-2 border px-3 py-2 font-mono text-sm ${
                privateMode 
                  ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]" 
                  : "bg-purple-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              }`}>
                <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-purple-700"}`}>
                  {solBalance !== null ? `${privateMode ? "◈ " : ""}${solBalance.toFixed(2)} SOL` : '---'}
                </span>
                <span className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-purple-500"}`}>{privateMode ? "[DEV]" : "(devnet)"}</span>
              </div>
              <Link href="/profile">
                <button 
                  className={`font-mono font-bold border px-3 md:px-4 py-2 uppercase text-sm transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80]/50 text-[#4ADE80] hover:border-[#4ADE80] hover:shadow-[0_0_10px_rgba(57,255,20,0.3)]" 
                      : "bg-red-500 text-white border-black hover:translate-x-1 hover:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                  data-testid="button-profile"
                >
                  {privateMode ? `[${obfuscateWallet(connectedWallet)}]` : "Profile"}
                </button>
              </Link>
            </>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className={`font-mono font-bold border px-3 md:px-4 py-2 uppercase text-sm transition-all ${
                privateMode 
                  ? "bg-black border-[#4ADE80]/50 text-[#4ADE80] hover:border-[#4ADE80] hover:shadow-[0_0_10px_rgba(57,255,20,0.3)]" 
                  : "bg-white text-red-500 border-black hover:bg-red-50 hover:translate-x-1 hover:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              }`}
              data-testid="button-login"
            >
              {privateMode ? "> CONNECT" : "LOG IN"}
            </button>
          )}
        </div>
      </header>

      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)}
        onConnect={contextConnect}
      />

      <PrivacyDrawer
        isOpen={showPrivacyDrawer}
        onClose={() => setShowPrivacyDrawer(false)}
      />

      <main className="flex-1 p-4 md:p-8 container mx-auto max-w-7xl relative pb-20 md:pb-8">
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <MobileBottomNav />

      <footer className={`hidden md:block p-8 border-t-2 text-center font-mono text-sm transition-colors duration-300 relative z-20 ${
        privateMode 
          ? "bg-black/90 border-[#4ADE80]/20 text-[#4ADE80]/50" 
          : "bg-white border-black text-gray-500"
      }`}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <a 
            href="https://x.com/dumdotfun" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`transition-colors ${privateMode ? "hover:text-[#4ADE80]" : "hover:text-black"}`}
          >
            {privateMode ? "// @dumdotfun" : "@dumdotfun"}
          </a>
        </div>
        
        <div className="mb-4">
          {!showRefundJoke ? (
            <motion.button
              onClick={() => setShowRefundJoke(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`font-black px-8 py-3 text-lg border-2 rounded-lg transition-all uppercase ${
                privateMode 
                  ? "bg-black border-[#4ADE80]/50 text-[#4ADE80] hover:border-[#4ADE80] hover:shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                  : "bg-green-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              }`}
              data-testid="button-refund"
            >
              {privateMode ? "> REQUEST_REFUND" : "Request Refund"}
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`inline-block font-black px-8 py-4 text-3xl border-4 rounded-lg ${
                privateMode 
                  ? "bg-black border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(255,0,0,0.3)]"
                  : "bg-red-500 text-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              }`}
            >
              {privateMode ? "ACCESS_DENIED" : "LOL NO"}
            </motion.div>
          )}
        </div>
        
        <p className={privateMode ? "text-[#4ADE80]/30" : ""}>
          {privateMode ? "// © 2025 D/\\EMON NETWORK" : "© 2025 Dum.fun. All rights reserved."}
        </p>
      </footer>
    </div>
  );
}
