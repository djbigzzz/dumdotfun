import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy, obfuscateWallet } from "@/lib/privacy-context";
import { motion, AnimatePresence } from "framer-motion";
import { X, EyeOff, Eye, Shield, Ghost, Info } from "lucide-react";
import { toast } from "sonner";

import pillLogo from "@assets/Gemini_Generated_Image_ya5y9zya5y9zya5y_1764326352852.png";
import { PrivacyDrawer } from "./privacy-drawer";

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
        toast.success(privateMode ? "Privacy mode disabled" : "Privacy mode enabled - you are now anonymous");
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenDrawer();
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2 px-3 py-2 font-mono font-bold text-sm border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
        privateMode 
          ? "bg-violet-600 text-white" 
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      data-testid="button-privacy-toggle"
      title={privateMode ? "Disable privacy mode" : "Enable privacy mode"}
    >
      <AnimatePresence mode="wait">
        {privateMode ? (
          <motion.div
            key="private"
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            className="flex items-center gap-2"
          >
            <Ghost className="w-4 h-4" />
            <span className="hidden sm:inline">STEALTH</span>
          </motion.div>
        ) : (
          <motion.div
            key="public"
            initial={{ opacity: 0, rotate: 90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: -90 }}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
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
    <div className={`min-h-screen flex flex-col selection:bg-red-500 selection:text-white transition-colors duration-300 ${
      privateMode 
        ? "bg-zinc-950 text-gray-100" 
        : "bg-gray-50 text-gray-900"
    }`}>
      {privateMode && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-transparent to-cyan-900/30" />
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            opacity: 0.15
          }} />
        </div>
      )}
      <Marquee />
      <header className={`p-4 border-b-2 border-black flex justify-between items-center transition-colors duration-300 ${
        privateMode ? "bg-zinc-900" : "bg-white"
      }`}>
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
              <img src={pillLogo} alt="DUM.FUN" className="h-10 md:h-12 w-auto" />
              <h1 className={`text-xl md:text-3xl font-black tracking-tighter uppercase hidden sm:block ${
                  privateMode ? "text-violet-400" : "text-red-500"
                }`} style={{ textShadow: privateMode ? "2px 2px 0px hsl(280 100% 30%)" : "2px 2px 0px hsl(60 100% 50%)" }}>
                {privateMode ? "GHOST.FUN" : "DUM.FUN"}
              </h1>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/tokens">
              <span className={`font-bold transition-colors cursor-pointer ${privateMode ? "text-gray-300 hover:text-violet-400" : "text-gray-700 hover:text-red-500"}`}>Tokens</span>
            </Link>
            <Link href="/create">
              <span className={`font-bold transition-colors cursor-pointer ${privateMode ? "text-gray-300 hover:text-violet-400" : "text-gray-700 hover:text-red-500"}`}>Launch</span>
            </Link>
            <Link href="/docs">
              <span className={`font-bold transition-colors cursor-pointer ${privateMode ? "text-gray-300 hover:text-cyan-400" : "text-gray-700 hover:text-blue-500"}`}>Docs</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <PrivacyToggle onOpenDrawer={() => setShowPrivacyDrawer(true)} />
            <button
              onClick={() => setShowPrivacyDrawer(true)}
              className={`p-2 -ml-1 transition-colors ${
                privateMode ? "text-violet-400 hover:text-violet-300" : "text-gray-400 hover:text-gray-600"
              }`}
              title="View privacy features"
              data-testid="button-privacy-info"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          {connectedWallet ? (
            <>
              <div className={`hidden sm:flex items-center gap-2 border-2 border-black px-3 py-2 font-mono text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-zinc-800" : "bg-purple-100"
              }`}>
                <span className={`font-bold ${privateMode ? "text-violet-400" : "text-purple-700"}`}>
                  {solBalance !== null ? `${solBalance.toFixed(2)} SOL` : '---'}
                </span>
                <span className={`text-xs ${privateMode ? "text-gray-500" : "text-purple-500"}`}>(devnet)</span>
              </div>
              <Link href="/profile">
                <button 
                  className={`font-mono font-bold border-2 border-black px-3 md:px-4 py-2 uppercase text-sm transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    privateMode ? "bg-violet-600 text-white" : "bg-red-500 text-white"
                  }`}
                  data-testid="button-profile"
                >
                  {privateMode ? obfuscateWallet(connectedWallet) : "Profile"}
                </button>
              </Link>
            </>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className={`font-mono font-bold border-2 border-black px-3 md:px-4 py-2 uppercase text-sm transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-zinc-800 text-violet-400 hover:bg-zinc-700" : "bg-white text-red-500 hover:bg-red-50"
              }`}
              data-testid="button-login"
            >
              LOG IN
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

      <main className="flex-1 p-4 md:p-8 container mx-auto max-w-7xl relative">
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <footer className={`p-8 border-t-2 border-black text-center font-mono text-sm transition-colors duration-300 ${
        privateMode ? "bg-zinc-900 text-gray-500" : "bg-white text-gray-500"
      }`}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <a href="https://x.com/dumdotfun" target="_blank" rel="noopener noreferrer" className="hover:text-black transition-colors">@dumdotfun</a>
        </div>
        
        <div className="mb-4">
          {!showRefundJoke ? (
            <motion.button
              onClick={() => setShowRefundJoke(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-green-500 text-white font-black px-8 py-3 text-lg border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all uppercase"
              data-testid="button-refund"
            >
              Request Refund
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="inline-block bg-red-500 text-white font-black px-8 py-4 text-3xl border-4 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              LOL NO
            </motion.div>
          )}
        </div>
        
        <p>© 2025 Dum.fun. All rights reserved.</p>
      </footer>
    </div>
  );
}
