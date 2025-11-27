import { Token } from "@/lib/mockData";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Skull } from "lucide-react";

interface TokenCardProps {
  token: Token;
  isVillageIdiot?: boolean;
}

export function TokenCard({ token, isVillageIdiot }: TokenCardProps) {
  return (
    <Link href={`/token/${token.id}`}>
      <motion.div
        whileHover={{ scale: 1.02, rotate: Math.random() * 2 - 1 }}
        className={`
          relative p-4 border bg-zinc-900 cursor-pointer group overflow-hidden
          ${isVillageIdiot ? "border-red-500 animate-pulse" : "border-red-900 hover:border-red-500"}
        `}
      >
        {isVillageIdiot && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white font-bold px-2 py-1 text-xs rotate-12 z-20 border border-white animate-bounce">
            CRASHING NOW!!!
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="relative">
            <img 
              src={token.imageUrl} 
              alt={token.name} 
              className={`w-24 h-24 object-cover border border-red-900 grayscale contrast-125 group-hover:grayscale-0 transition-all ${isVillageIdiot ? "blur-[1px]" : ""}`} 
            />
            {token.status === "DEAD" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Skull className="text-red-500 w-12 h-12" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-black uppercase truncate text-gray-100 group-hover:text-yellow-400">
                {token.name}
              </h3>
            </div>
            <p className="font-mono text-sm text-gray-500 mb-2">{token.ticker}</p>
            
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Mkt Cap:</span>
                <span className="text-red-500">${token.marketCap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`${
                  token.status === "CRASHING" ? "text-red-500 font-bold animate-pulse" : 
                  token.status === "DEAD" ? "text-gray-600" : "text-yellow-600"
                }`}>
                  {token.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Glitch overlay on hover */}
        <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity mix-blend-overlay" />
        
        {/* Error lines decoration */}
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-700 opacity-50">
          ERR_CONNECTION_RESET
        </div>
      </motion.div>
    </Link>
  );
}
