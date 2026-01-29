import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2, Droplets } from "lucide-react";
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
  notDeployed?: boolean;
  noTradesYet?: boolean;
  message?: string;
}

interface TokenHoldersCardProps {
  tokenMint: string;
  compact?: boolean;
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

  return (
    <div className={`rounded-xl overflow-hidden ${
      privateMode 
        ? "bg-black/80 border border-[#4ADE80]/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]" 
        : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-4 py-3 flex items-center justify-between ${
          privateMode ? "hover:bg-[#4ADE80]/5" : "hover:bg-gray-50"
        }`}
        data-testid="button-expand-holders-card"
      >
        <span className={`font-bold text-sm ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-900"}`}>
          {privateMode ? "// TOP_HOLDERS" : "Top holders"}
        </span>
        {expanded ? (
          <ChevronUp className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-3 ${privateMode ? "border-t border-[#4ADE80]/20" : "border-t border-gray-100"}`}>
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className={`w-5 h-5 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-gray-400"}`} />
                </div>
              ) : error ? (
                <div className={`text-center py-4 text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                  Failed to load
                </div>
              ) : data?.notDeployed ? (
                <div className={`text-center py-4 text-sm ${privateMode ? "text-orange-400" : "text-orange-600"}`}>
                  Not deployed on-chain
                </div>
              ) : data?.noTradesYet || holders.length === 0 ? (
                <div className="py-3 space-y-1">
                  <div className={`flex items-center justify-between text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-700"}`}>
                    <div className="flex items-center gap-2">
                      <Droplets className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]" : "text-purple-500"}`} />
                      <span className={privateMode ? "font-mono" : ""}>
                        {privateMode ? "bonding_curve" : "Bonding curve"}
                      </span>
                    </div>
                    <span className={`font-medium ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>100.00%</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  {holders.slice(0, compact ? 8 : 15).map((holder) => (
                    <div
                      key={holder.address}
                      className={`flex items-center justify-between py-1 text-sm`}
                    >
                      <div className="flex items-center gap-2">
                        {holder.isBondingCurve ? (
                          <>
                            <Droplets className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]" : "text-purple-500"}`} />
                            <span className={privateMode ? "text-[#4ADE80]/70 font-mono" : "text-gray-700"}>
                              {privateMode ? "liquidity_pool" : "Liquidity pool"}
                            </span>
                          </>
                        ) : (
                          <Link href={`/user/${holder.address}`}>
                            <span className={`font-mono hover:underline cursor-pointer ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80]" : "text-gray-700 hover:text-gray-900"}`}>
                              {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                            </span>
                          </Link>
                        )}
                      </div>
                      <span className={`font-medium ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                        {holder.percentage.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                  
                  {holders.length > (compact ? 8 : 15) && (
                    <div className={`text-center pt-2 text-xs ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                      +{holders.length - (compact ? 8 : 15)} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
