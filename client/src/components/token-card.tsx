import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Cpu, Lock } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

interface TokenPrediction {
  id: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  status: string;
}

interface TokenWithPredictions {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  predictions?: TokenPrediction[];
}

interface TokenCardProps {
  token: TokenWithPredictions;
  solPrice?: number | null;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(0)}`;
  return `$${(mcSol * ((window as any).lastSolPrice || 0)).toFixed(2)}`;
}

export function TokenCard({ token, solPrice = null }: TokenCardProps) {
  const { privateMode } = usePrivacy();
  const topPrediction = token.predictions?.[0];
  
  return (
    <Link href={`/token/${token.mint}`}>
      <motion.div
        whileHover={{ y: -2, x: -2 }}
        whileTap={{ y: 0, x: 0 }}
        className={`relative p-5 border-2 transition-all cursor-pointer group overflow-hidden ${
          privateMode 
            ? "bg-black border-[#4ADE80] hover:shadow-[0_0_30px_rgba(57,255,20,0.3)]" 
            : "bg-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        }`}
        data-testid={`token-card-${token.mint}`}
      >
        {token.isGraduated && (
          <div className={`absolute -top-1 -right-1 font-bold px-2 py-0.5 text-[10px] rotate-12 z-20 border ${
            privateMode ? "bg-black text-[#4ADE80] border-[#4ADE80]" : "bg-green-500 text-white border-black"
          }`}>
            {privateMode ? "[ GRADUATED ]" : "GRADUATED"}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
              privateMode ? "bg-black border-[#4ADE80]/30" : "bg-gray-100 border-black"
            }`}>
              {token.imageUri ? (
                <img 
                  src={token.imageUri} 
                  alt={token.name} 
                  className={`w-full h-full object-cover ${privateMode ? "opacity-80 sepia brightness-90 saturate-150 hue-rotate-60" : ""}`}
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center font-black text-xl ${
                  privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-50 text-red-500"
                }`}>
                  {token.symbol[0]}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-xl font-black uppercase truncate transition-colors ${
                privateMode 
                  ? "text-[#4ADE80] font-mono group-hover:text-white" 
                  : "text-gray-900 group-hover:text-red-500"
              }`}>
                {token.name}
              </h3>
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${
                privateMode 
                  ? "bg-black text-[#4ADE80]/50 border-[#4ADE80]/20" 
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}>
                ${token.symbol}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
              <div>
                <span className={privateMode ? "text-[#4ADE80]/80" : "text-gray-500"}>Cap: </span>
                <span className={`font-bold ${privateMode ? "text-white" : "text-green-600"}`}>
                  {privateMode ? "◈ " : ""}{formatMarketCap(token.marketCapSol, solPrice)}
                </span>
              </div>
              <div>
                <span className={privateMode ? "text-[#4ADE80]/80" : "text-gray-500"}>Progress: </span>
                <span className={`font-bold ${
                  privateMode 
                    ? "text-white" 
                    : token.bondingCurveProgress > 80 ? "text-green-600" : token.bondingCurveProgress > 50 ? "text-yellow-600" : "text-red-500"
                }`}>
                  {token.bondingCurveProgress.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Bonding curve progress bar */}
            <div className={`h-1.5 rounded-full overflow-hidden mb-3 border ${
              privateMode ? "bg-black border-[#4ADE80]/20" : "bg-gray-200 border-gray-300"
            }`}>
              <div 
                className={`h-full transition-all ${
                  privateMode 
                    ? "bg-[#4ADE80] shadow-[0_0_10px_rgba(57,255,20,0.5)]" 
                    : token.bondingCurveProgress > 80 ? "bg-green-500" : token.bondingCurveProgress > 50 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${token.bondingCurveProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top Prediction Market */}
        {topPrediction && (
          <div className={`mt-3 pt-3 border-t-2 border-dashed ${privateMode ? "border-[#4ADE80]/20" : "border-gray-200"}`}>
            <div className="flex items-center gap-1 mb-2">
              {privateMode ? <Cpu className="w-3 h-3 text-[#4ADE80]" /> : <TrendingUp className="w-3 h-3 text-pink-500" />}
              <span className={`text-[10px] font-bold uppercase ${privateMode ? "text-[#4ADE80]/70 font-mono" : "text-pink-500"}`}>
                {privateMode ? "// ACTIVE_MARKET" : "Hot Prediction"}
              </span>
            </div>
            
            <p className={`text-sm font-bold mb-2 line-clamp-1 ${privateMode ? "text-white font-mono" : "text-gray-700"}`}>
              {privateMode ? `> ${topPrediction.question.toUpperCase()}` : topPrediction.question}
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`border rounded py-1 px-2 text-center transition-all ${
                  privateMode 
                    ? "bg-black border-[#4ADE80]/30 hover:bg-[#4ADE80]/10 hover:border-[#4ADE80]" 
                    : "bg-green-100 border-green-300 hover:bg-green-200"
                }`}
                onClick={(e) => e.preventDefault()}
              >
                <span className={`block font-black text-sm ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>{topPrediction.yesOdds}%</span>
                <span className={`block text-[10px] font-bold ${privateMode ? "text-[#4ADE80]/50" : "text-green-500"}`}>YES</span>
              </button>
              <button
                className={`border rounded py-1 px-2 text-center transition-all ${
                  privateMode 
                    ? "bg-black border-[#FF1744]/30 hover:bg-[#FF1744]/10 hover:border-[#FF1744]" 
                    : "bg-red-100 border-red-300 hover:bg-red-200"
                }`}
                onClick={(e) => e.preventDefault()}
              >
                <span className={`block font-black text-sm ${privateMode ? "text-[#FF1744]" : "text-red-600"}`}>{topPrediction.noOdds}%</span>
                <span className={`block text-[10px] font-bold ${privateMode ? "text-[#FF1744]/50" : "text-red-500"}`}>NO</span>
              </button>
            </div>
            
            <div className={`flex items-center justify-between mt-2 text-[10px] font-mono ${privateMode ? "text-[#4ADE80]/80" : "text-gray-500"}`}>
              <span>{topPrediction.totalVolume.toFixed(2)} SOL VOL</span>
              {token.predictions && token.predictions.length > 1 && (
                <span className={privateMode ? "text-white" : "text-pink-500"}>
                  {privateMode ? `+${token.predictions.length - 1}_MODULES` : `+${token.predictions.length - 1} more`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* No predictions placeholder */}
        {(!token.predictions || token.predictions.length === 0) && (
          <div className={`mt-3 pt-3 border-t-2 border-dashed ${privateMode ? "border-[#4ADE80]/10" : "border-gray-200"}`}>
            <div className={`flex items-center justify-center gap-2 py-2 ${privateMode ? "text-[#4ADE80]/20" : "text-gray-400"}`}>
              {privateMode ? <Lock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span className={`text-xs ${privateMode ? "font-mono" : ""}`}>
                {privateMode ? "// NO_DATA_AVAILABLE" : "No predictions yet"}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}
