import { Link } from "wouter";
import { motion } from "framer-motion";
import { TrendingUp, Clock } from "lucide-react";

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
}

export function TokenCard({ token }: TokenCardProps) {
  const topPrediction = token.predictions?.[0];
  
  return (
    <Link href={`/token/${token.mint}`}>
      <motion.div
        whileHover={{ y: -2, x: -2 }}
        whileTap={{ y: 0, x: 0 }}
        className="relative p-4 bg-white border-2 border-black rounded-lg cursor-pointer group overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
        data-testid={`token-card-${token.mint}`}
      >
        {token.isGraduated && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white font-bold px-2 py-0.5 text-[10px] rotate-12 z-20 border border-black">
            GRADUATED
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-black overflow-hidden">
              {token.imageUri ? (
                <img 
                  src={token.imageUri} 
                  alt={token.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-red-500 font-black text-xl bg-gray-50">
                  {token.symbol[0]}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-black uppercase truncate text-gray-900 group-hover:text-red-500 transition-colors">
                {token.name}
              </h3>
              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                ${token.symbol}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
              <div>
                <span className="text-gray-500">Cap: </span>
                <span className="text-green-600 font-bold">{token.marketCapSol.toFixed(2)} SOL</span>
              </div>
              <div>
                <span className="text-gray-500">Progress: </span>
                <span className={`font-bold ${token.bondingCurveProgress > 80 ? "text-green-600" : token.bondingCurveProgress > 50 ? "text-yellow-600" : "text-red-500"}`}>
                  {token.bondingCurveProgress.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Bonding curve progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3 border border-gray-300">
              <div 
                className={`h-full transition-all ${token.bondingCurveProgress > 80 ? "bg-green-500" : token.bondingCurveProgress > 50 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${token.bondingCurveProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top Prediction Market */}
        {topPrediction && (
          <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200">
            <div className="flex items-center gap-1 mb-2">
              <TrendingUp className="w-3 h-3 text-pink-500" />
              <span className="text-[10px] font-bold text-pink-500 uppercase">Hot Prediction</span>
            </div>
            
            <p className="text-xs font-bold text-gray-700 mb-2 line-clamp-1">
              {topPrediction.question}
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                className="bg-green-100 border border-green-300 rounded py-1 px-2 text-center hover:bg-green-200 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <span className="block text-green-600 font-black text-sm">{topPrediction.yesOdds}%</span>
                <span className="block text-[10px] text-green-500 font-bold">YES</span>
              </button>
              <button
                className="bg-red-100 border border-red-300 rounded py-1 px-2 text-center hover:bg-red-200 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <span className="block text-red-600 font-black text-sm">{topPrediction.noOdds}%</span>
                <span className="block text-[10px] text-red-500 font-bold">NO</span>
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
              <span>{topPrediction.totalVolume.toFixed(2)} SOL vol</span>
              {token.predictions && token.predictions.length > 1 && (
                <span className="text-pink-500">+{token.predictions.length - 1} more</span>
              )}
            </div>
          </div>
        )}

        {/* No predictions placeholder */}
        {(!token.predictions || token.predictions.length === 0) && (
          <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200">
            <div className="flex items-center justify-center gap-2 py-2 text-gray-400">
              <Clock className="w-3 h-3" />
              <span className="text-xs">No predictions yet</span>
            </div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}
