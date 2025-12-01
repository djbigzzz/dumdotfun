import React from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";

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

export function Layout({ children }: { children: React.ReactNode }) {
  const handleRefund = () => {
    alert("LOL NO.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-gray-100 selection:bg-red-600 selection:text-white">
      <Marquee />
      <header className="p-4 border-b border-red-900 flex justify-center items-center bg-zinc-900">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
            <img src={pillLogo} alt="DUM.FUN" className="h-14 md:h-16 w-auto" />
            <h1 className="text-3xl md:text-5xl font-black text-red-500 tracking-tighter uppercase hidden sm:block" style={{ textShadow: "2px 2px 0px hsl(60 100% 50%)" }}>
              DUM.FUN
            </h1>
          </div>
        </Link>
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
