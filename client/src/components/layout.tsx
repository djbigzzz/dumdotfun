import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { X, Wifi } from "lucide-react";
import { toast } from "sonner";

import pillLogo from "@assets/Gemini_Generated_Image_ya5y9zya5y9zya5y_1764326352852.png";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { NotificationBell } from "./notification-bell";

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

const DevnetBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  const switchToDevnet = async () => {
    try {
      const phantom = (window as any).solana;
      if (!phantom?.isPhantom) {
        toast.error("Phantom wallet not detected");
        return;
      }
      if (phantom.request) {
        await phantom.request({
          method: "switchNetwork",
          params: { network: "devnet" },
        });
        toast.success("Switched to Solana Devnet!");
      } else {
        toast.info("Open Phantom → Settings → Developer Settings → Change Network to Devnet");
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.info("Network switch cancelled");
      } else {
        toast.info("Open Phantom → Settings → Developer Settings → Change Network to Devnet");
      }
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative z-20 px-3 py-2 flex items-center justify-center gap-3 text-sm bg-yellow-50 border-b-2 border-yellow-300" data-testid="banner-devnet">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"
        />
        <span className="font-bold text-xs text-yellow-800">
          Devnet Mode
        </span>
        <span className="text-xs hidden sm:inline text-yellow-700">
          — This app runs on Solana Devnet. Make sure your wallet is set to devnet.
        </span>
      </div>
      <button
        onClick={switchToDevnet}
        className="text-[11px] font-black px-3 py-1 rounded flex items-center gap-1.5 transition-all flex-shrink-0 bg-yellow-400 text-yellow-900 border border-yellow-500 hover:bg-yellow-500 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
        data-testid="button-switch-devnet"
      >
        <Wifi className="w-3 h-3" />
        Switch to Devnet
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded transition-colors flex-shrink-0 text-yellow-600 hover:text-yellow-800"
        data-testid="button-dismiss-devnet"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { connectedWallet, connectWallet: contextConnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
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
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 selection:bg-red-500 selection:text-white">
      <div className="hidden md:block">
        <Marquee />
      </div>
      <header className="p-3 md:p-4 border-b-2 flex justify-between items-center bg-white border-black relative z-20">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform flex-shrink-0">
              <img src={pillLogo} alt="DUM.FUN" className="h-10 md:h-12 w-auto" />
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tighter uppercase text-red-500" style={{ textShadow: "2px 2px 0px hsl(60 100% 50%)" }}>
                DUM.FUN
              </h1>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-3 lg:gap-4">
            <Link href="/create">
              <span className="font-bold transition-colors cursor-pointer text-gray-700 hover:text-red-500">Launch</span>
            </Link>
            <Link href="/markets">
              <span className="font-bold transition-colors cursor-pointer text-gray-700 hover:text-green-500">Markets</span>
            </Link>
            <Link href="/quests">
              <span className="font-bold transition-colors cursor-pointer text-gray-700 hover:text-purple-500">Quests</span>
            </Link>
            <Link href="/leaderboard">
              <span className="font-bold transition-colors cursor-pointer text-gray-700 hover:text-yellow-500">Ranks</span>
            </Link>
            <Link href="/docs">
              <span className="font-bold transition-colors cursor-pointer text-gray-700 hover:text-blue-500">Docs</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <NotificationBell />
          {connectedWallet ? (
            <>
              <div className="hidden sm:flex items-center gap-2 border px-3 py-2 font-mono text-sm bg-purple-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <span className="font-bold text-purple-700">
                  {solBalance != null ? `${Number(solBalance).toFixed(2)} SOL` : '---'}
                </span>
                <span className="text-xs text-purple-500">(devnet)</span>
              </div>
              <Link href="/profile">
                <button 
                  className="font-mono font-bold border px-3 md:px-4 py-2 uppercase text-sm transition-all bg-red-500 text-white border-black hover:translate-x-1 hover:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="button-profile"
                >
                  Profile
                </button>
              </Link>
            </>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="font-mono font-bold border px-3 md:px-4 py-2 uppercase text-sm transition-all bg-white text-red-500 border-black hover:bg-red-50 hover:translate-x-1 hover:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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

      <DevnetBanner />

      <main className="flex-1 p-4 md:p-8 container mx-auto max-w-7xl relative pb-20 md:pb-8">
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <MobileBottomNav />

      <footer className="hidden md:block p-8 border-t-2 text-center font-mono text-sm bg-white border-black text-gray-500 relative z-20">
        <div className="flex items-center justify-center gap-4 mb-4">
          <a 
            href="https://x.com/dumdotfun" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="transition-colors hover:text-black"
          >
            @dumdotfun
          </a>
        </div>
        
        <div className="mb-4">
          {!showRefundJoke ? (
            <motion.button
              onClick={() => setShowRefundJoke(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="font-black px-8 py-3 text-lg border-2 rounded-lg transition-all uppercase bg-green-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              data-testid="button-refund"
            >
              Request Refund
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="inline-block font-black px-8 py-4 text-3xl border-4 rounded-lg bg-red-500 text-white border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              LOL NO
            </motion.div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-5 text-[10px]">
          <span className="font-bold uppercase tracking-wider text-gray-300">
            Built on
          </span>
          <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="font-bold transition-colors text-gray-400 hover:text-black" data-testid="outbound-solana">
            Solana
          </a>
          <span className="text-gray-200">&middot;</span>
          <a href="https://raydium.io" target="_blank" rel="noopener noreferrer" className="font-bold transition-colors text-gray-400 hover:text-black" data-testid="outbound-raydium">
            Raydium
          </a>
          <span className="text-gray-200">&middot;</span>
          <a href="https://www.helius.dev" target="_blank" rel="noopener noreferrer" className="font-bold transition-colors text-gray-400 hover:text-black" data-testid="outbound-helius">
            Helius
          </a>
          <span className="text-gray-200">&middot;</span>
          <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="font-bold transition-colors text-gray-400 hover:text-black" data-testid="outbound-phantom">
            Phantom
          </a>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4 text-xs" aria-label="Site navigation">
          <a href="/tokens" className="transition-colors hover:text-black" data-testid="footer-link-tokens">
            All Tokens
          </a>
          <a href="/trending" className="transition-colors hover:text-black" data-testid="footer-link-trending">
            Trending
          </a>
          <a href="/markets" className="transition-colors hover:text-black" data-testid="footer-link-markets">
            Markets
          </a>
          <a href="/create" className="transition-colors hover:text-black" data-testid="footer-link-create">
            Launch Token
          </a>
          <a href="/quests" className="transition-colors hover:text-black" data-testid="footer-link-quests">
            Quests
          </a>
          <a href="/leaderboard" className="transition-colors hover:text-black" data-testid="footer-link-leaderboard">
            Leaderboard
          </a>
          <a href="/docs" className="transition-colors hover:text-black" data-testid="footer-link-docs">
            Documentation
          </a>
        </nav>

        <div className="flex items-center justify-center gap-4 mb-3 text-xs">
          <a href="/legal/privacy" className="transition-colors underline hover:text-black" data-testid="link-privacy-policy">
            Privacy Policy
          </a>
          <span>|</span>
          <a href="/legal/eula" className="transition-colors underline hover:text-black" data-testid="link-terms">
            Terms of Service
          </a>
          <span>|</span>
          <a href="/legal/copyright" className="transition-colors underline hover:text-black" data-testid="link-copyright">
            Copyright
          </a>
        </div>
        <p>
          © 2026 Dum.fun. All rights reserved.
        </p>
        <p className="text-xs mt-1 text-gray-400">
          v1.2.0
        </p>
      </footer>
    </div>
  );
}
