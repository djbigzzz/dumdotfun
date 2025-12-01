import React from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import pillLogo from "@assets/Gemini_Generated_Image_ya5y9zya5y9zya5y_1764326352852.png";

const Marquee = () => {
  return (
    <div 
      className="py-3 overflow-hidden border-b border-red-600/50 relative"
      style={{
        background: "linear-gradient(90deg, rgba(239,68,68,0.15) 0%, rgba(127,29,29,0.2) 50%, rgba(239,68,68,0.15) 100%)",
      }}
    >
      <div className="flex items-center justify-center gap-2 animate-marquee whitespace-nowrap font-mono text-sm">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-red-500 font-black">⚡</span>
            <span className="text-red-400 font-black">LIVE NOW</span>
            <span className="text-red-600">•</span>
            <span className="text-gray-400">JOIN THE RACE</span>
            <span className="text-red-600">•</span>
            <span className="text-yellow-500 font-black">CLIMB THE RANKS</span>
            <span className="text-red-600 mx-2">•</span>
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
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      await onConnect();
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
  const { connectedWallet, connectWallet } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-gray-100 selection:bg-red-600 selection:text-white">
      <Marquee />
      <header className="p-4 border-b border-red-900 flex justify-between items-center bg-zinc-900">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
            <img src={pillLogo} alt="DUM.FUN" className="h-12 md:h-14 w-auto" />
            <h1 className="text-2xl md:text-4xl font-black text-red-500 tracking-tighter uppercase hidden sm:block" style={{ textShadow: "2px 2px 0px hsl(60 100% 50%)" }}>
              DUM.FUN
            </h1>
          </div>
        </Link>
        
        <div>
          {connectedWallet ? (
            <Link href="/profile">
              <button 
                className="font-mono font-bold border-2 border-red-600 px-3 md:px-4 py-2 uppercase text-sm transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0 bg-red-600 text-white"
                data-testid="button-profile"
              >
                Profile
              </button>
            </Link>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="font-mono font-bold border-2 border-red-600 px-3 md:px-4 py-2 uppercase text-sm transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0 bg-zinc-900 text-red-500 hover:bg-red-900/20"
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
        onConnect={connectWallet}
      />

      <main className="flex-1 p-4 md:p-8 container mx-auto max-w-7xl relative">
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url('/attached_assets/generated_images/gritty_digital_noise_texture.png')` }}></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <footer className="p-8 border-t border-red-900 bg-zinc-900 text-center font-mono text-sm text-neutral-500">
        <p className="mb-4">
          COPYRIGHT © 1999-2025 DUM.FUN INC. ALL RIGHTS RESERVED (BUT NOT REALLY).
        </p>
      </footer>
    </div>
  );
}
