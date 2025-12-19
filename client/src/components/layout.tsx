import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";

import pillLogo from "@assets/Gemini_Generated_Image_ya5y9zya5y9zya5y_1764326352852.png";

const Marquee = () => {
  return (
    <div 
      className="py-2 overflow-hidden border-b-2 border-black relative bg-red-500"
    >
      <div className="flex items-center justify-center gap-2 animate-marquee whitespace-nowrap font-mono text-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-white font-black">⚡</span>
            <span className="text-yellow-300 font-black">LAUNCH TOKENS</span>
            <span className="text-pink-200">•</span>
            <span className="text-pink-100">BET ON PREDICTIONS</span>
            <span className="text-pink-200">•</span>
            <span className="text-white font-black">WIN EITHER WAY</span>
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

export function Layout({ children }: { children: React.ReactNode }) {
  const { connectedWallet, connectWallet: contextConnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 selection:bg-red-500 selection:text-white">
      <Marquee />
      <header className="p-4 border-b-2 border-black flex justify-between items-center bg-white">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
              <img src={pillLogo} alt="DUM.FUN" className="h-10 md:h-12 w-auto" />
              <h1 className="text-xl md:text-3xl font-black text-red-500 tracking-tighter uppercase hidden sm:block" style={{ textShadow: "2px 2px 0px hsl(60 100% 50%)" }}>
                DUM.FUN
              </h1>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/tokens">
              <span className="font-bold text-gray-700 hover:text-red-500 transition-colors cursor-pointer">Tokens</span>
            </Link>
            <Link href="/create">
              <span className="font-bold text-gray-700 hover:text-red-500 transition-colors cursor-pointer">Launch</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {connectedWallet ? (
            <Link href="/profile">
              <button 
                className="font-mono font-bold border-2 border-black px-3 md:px-4 py-2 uppercase text-sm transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0 bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                data-testid="button-profile"
              >
                Profile
              </button>
            </Link>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="font-mono font-bold border-2 border-black px-3 md:px-4 py-2 uppercase text-sm transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0 bg-white text-red-500 hover:bg-red-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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

      <main className="flex-1 p-4 md:p-8 container mx-auto max-w-7xl relative">
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <footer className="p-8 border-t-2 border-black bg-white text-center font-mono text-sm text-gray-500">
        <p className="mb-4">
          COPYRIGHT © 1999-2025 DUM.FUN INC. ALL RIGHTS RESERVED (BUT NOT REALLY).
        </p>
      </footer>
    </div>
  );
}
