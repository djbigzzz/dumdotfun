import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const Marquee = () => {
  return (
    <div className="bg-red-600 text-black font-sans font-black text-lg py-2 overflow-hidden whitespace-nowrap border-b-4 border-black">
      <div className="animate-marquee inline-block">
        WARNING: YOU WILL LOSE MONEY • THIS IS FINANCIAL SUICIDE • HAVE FUN STAYING POOR • RUG PULLS ARE A FEATURE NOT A BUG • DO NOT CONNECT YOUR WALLET • 
        WARNING: YOU WILL LOSE MONEY • THIS IS FINANCIAL SUICIDE • HAVE FUN STAYING POOR • RUG PULLS ARE A FEATURE NOT A BUG • DO NOT CONNECT YOUR WALLET •
      </div>
    </div>
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [panicMode, setPanicMode] = useState(false);

  useEffect(() => {
    if (panicMode) {
      document.body.classList.add("panic-mode");
    } else {
      document.body.classList.remove("panic-mode");
    }
  }, [panicMode]);

  const connectWallet = () => {
    const addr = "8x" + Math.random().toString(16).slice(2, 8) + "...";
    setWalletAddress(addr);
  };

  const handleRefund = () => {
    alert("LOL NO.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-gray-100 selection:bg-red-600 selection:text-white">
      <Marquee />
      
      <header className="p-4 border-b border-red-900 flex justify-between items-center bg-zinc-900">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
            <img src="/attached_assets/Gemini_Generated_Image_shfsmzshfsmzshfs_1764324928223.png" alt="DUM.FUN" className="h-14 md:h-16 w-auto" />
            <h1 className="text-3xl md:text-5xl font-black text-red-500 tracking-tighter uppercase hidden sm:block" style={{ textShadow: "2px 2px 0px hsl(60 100% 50%)" }}>
              DUM.FUN
            </h1>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPanicMode(!panicMode)}
            className={cn(
              "border-2 px-3 py-2 font-mono font-bold uppercase text-sm rounded-none transition-all",
              panicMode 
                ? "bg-red-600 text-white border-red-600" 
                : "bg-zinc-900 text-red-500 border-red-500 hover:bg-red-900/20"
            )}
          >
            {panicMode ? "EYES FINE" : "EYES HURT?"}
          </button>
          
          <button 
            onClick={connectWallet}
            className={cn(
              "font-mono font-bold border-2 border-red-600 px-4 py-2 uppercase transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-0 active:translate-y-0",
              walletAddress ? "bg-red-600 text-white" : "bg-zinc-900 text-red-500 hover:bg-red-900/20"
            )}
          >
            {walletAddress ? `VICTIM [${walletAddress}]` : "CONNECT WALLET (DONT)"}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 container mx-auto max-w-7xl relative">
        {/* Background noise overlay */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: `url('/attached_assets/generated_images/gritty_digital_noise_texture.png')` }}></div>
        
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <footer className="p-8 border-t border-red-900 bg-zinc-900 text-center font-mono text-sm text-neutral-500">
        <p className="mb-4">
          COPYRIGHT © 1999-2025 DUM.FUN INC. ALL RIGHTS RESERVED (BUT NOT REALLY).
        </p>
        <button onClick={handleRefund} className="underline hover:text-red-600 cursor-pointer text-xs">
          Request Refund
        </button>
      </footer>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
