import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePrivacy } from "@/lib/privacy-context";
import { Link } from "wouter";

interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
  isBondingCurve?: boolean;
}

interface TokenHoldersResponse {
  success: boolean;
  holders: TokenHolder[];
  totalHolders: number;
  totalSupplyHeld: number;
}

interface TokenHoldersCardProps {
  tokenMint: string;
  compact?: boolean;
}

function formatBalance(balance: number): string {
  if (balance >= 1000000000) return `${(balance / 1000000000).toFixed(2)}B`;
  if (balance >= 1000000) return `${(balance / 1000000).toFixed(2)}M`;
  if (balance >= 1000) return `${(balance / 1000).toFixed(2)}K`;
  return balance.toFixed(2);
}

export function TokenHoldersCard({ tokenMint, compact = false }: TokenHoldersCardProps) {
  const { privateMode } = usePrivacy();
  const [expanded, setExpanded] = useState(!compact);

  const { data, isLoading, error } = useQuery<TokenHoldersResponse>({
    queryKey: ["token-holders", tokenMint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${tokenMint}/holders`);
      if (!res.ok) throw new Error("Failed to fetch holders");
      return res.json();
    },
    enabled: !!tokenMint,
    refetchInterval: 30000,
  });

  const holders = data?.holders || [];
  const totalHolders = data?.totalHolders || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden transition-all ${
        privateMode 
          ? "bg-black/80 border border-[#4ADE80]/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]" 
          : "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full p-4 flex items-center justify-between transition-colors ${
          privateMode ? "hover:bg-[#4ADE80]/5" : "hover:bg-white/50"
        }`}
        data-testid="button-expand-holders-card"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            privateMode ? "bg-[#4ADE80]/10 border border-[#4ADE80]/30" : "bg-blue-100 border-2 border-black"
          }`}>
            <Users className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-blue-600"}`} />
          </div>
          <div className="text-left">
            <h3 className={`font-bold ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-900"}`}>
              {privateMode ? "// TOKEN_OWNERS" : "Token Owners"}
            </h3>
            <p className={`text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
              {isLoading ? "Loading..." : `${totalHolders} holder${totalHolders !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            privateMode 
              ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30" 
              : "bg-blue-100 text-blue-700 border-2 border-black"
          }`}>
            LIVE
          </span>
          {expanded ? (
            <ChevronUp className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={`w-6 h-6 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-blue-500"}`} />
                </div>
              ) : error || holders.length === 0 ? (
                <div className={`text-center py-6 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                  {error ? "Failed to load holders" : "No holders found"}
                </div>
              ) : (
                <div className="space-y-2">
                  {holders.slice(0, compact ? 5 : 10).map((holder, index) => (
                    <div
                      key={holder.address}
                      className={`p-3 rounded-lg transition-all flex items-center justify-between ${
                        holder.isBondingCurve
                          ? privateMode 
                            ? "bg-purple-900/30 border border-purple-500/30" 
                            : "bg-purple-50 border-2 border-purple-300"
                          : privateMode 
                            ? "bg-black/50 border border-[#4ADE80]/20 hover:border-[#4ADE80]/40" 
                            : "bg-white border-2 border-gray-200 hover:border-black"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          holder.isBondingCurve
                            ? "bg-purple-500 text-white"
                            : index === 0 
                              ? privateMode ? "bg-[#4ADE80] text-black" : "bg-yellow-400 text-black"
                              : index === 1
                                ? privateMode ? "bg-[#4ADE80]/70 text-black" : "bg-gray-300 text-black"
                                : index === 2
                                  ? privateMode ? "bg-[#4ADE80]/50 text-black" : "bg-amber-600 text-white"
                                  : privateMode ? "bg-[#4ADE80]/20 text-[#4ADE80]" : "bg-gray-100 text-gray-600"
                        }`}>
                          {holder.isBondingCurve ? "BC" : index + 1}
                        </div>
                        <div>
                          {holder.isBondingCurve ? (
                            <span className={`font-mono text-sm ${privateMode ? "text-purple-400" : "text-purple-700"}`}>
                              {holder.address}
                            </span>
                          ) : (
                            <Link href={`/user/${holder.address}`}>
                              <span className={`font-mono text-sm hover:underline cursor-pointer ${privateMode ? "text-[#4ADE80]" : "text-gray-800"}`}>
                                {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`font-bold text-sm ${privateMode ? "text-white" : "text-gray-900"}`}>
                            {formatBalance(holder.balance)}
                          </div>
                          <div className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                            {holder.percentage.toFixed(2)}%
                          </div>
                        </div>
                        {!holder.isBondingCurve && (
                          <a
                            href={`https://solscan.io/account/${holder.address}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-1 rounded hover:bg-gray-100 ${privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80] hover:bg-[#4ADE80]/10" : "text-gray-400 hover:text-gray-600"}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {holders.length > (compact ? 5 : 10) && (
                    <div className={`text-center py-2 text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                      +{holders.length - (compact ? 5 : 10)} more holders
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
