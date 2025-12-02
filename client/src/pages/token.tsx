import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Twitter, MessageCircle, Globe, Loader2, AlertCircle, Target, Clock, Users, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface TokenPrediction {
  id: string;
  question: string;
  description: string | null;
  yesOdds: number;
  noOdds: number;
  yesPool: number;
  noPool: number;
  totalVolume: number;
  status: string;
  resolutionDate: string;
  createdAt: string;
}

interface TokenDetail {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  totalSupply: number;
  predictions?: TokenPrediction[];
}

interface TradingStatus {
  tradingEnabled: boolean;
  message: string;
  programId: string | null;
}

interface SolPrice {
  price: number;
  currency: string;
}

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const { connectedWallet, connectWallet } = useWallet();
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");

  const { data: token, isLoading, error } = useQuery<TokenDetail>({
    queryKey: ["token", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}`);
      if (!res.ok) throw new Error("Token not found");
      return res.json();
    },
    enabled: !!mint,
  });

  const { data: tradingStatus } = useQuery<TradingStatus>({
    queryKey: ["trading-status"],
    queryFn: async () => {
      const res = await fetch("/api/trading/status");
      return res.json();
    },
  });

  const { data: solPrice, isError: solPriceError } = useQuery<SolPrice | null>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) return null; // Return null when price unavailable
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="animate-pulse text-gray-400 font-mono">Loading token...</div>
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-4">
          <p className="text-red-500 font-mono">Token not found</p>
          <Link href="/">
            <button className="text-gray-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const progressColor = token.bondingCurveProgress > 80 
    ? "bg-green-500" 
    : token.bondingCurveProgress > 50 
    ? "bg-yellow-500" 
    : "bg-red-500";

  return (
    <Layout>
      <div className="space-y-6">
        <Link href="/">
          <button className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-mono">
            <ArrowLeft className="w-4 h-4" />
            Back to tokens
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg bg-zinc-800 border border-red-600/20 overflow-hidden flex-shrink-0">
                  {token.imageUri ? (
                    <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-red-500 font-black text-2xl">
                      {token.symbol[0]}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-black text-white">{token.name}</h1>
                    <span className="text-gray-400 font-mono">${token.symbol}</span>
                    {token.isGraduated && (
                      <span className="bg-green-600/20 border border-green-600/50 px-2 py-0.5 rounded text-xs font-mono text-green-400">
                        GRADUATED
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-2 max-w-lg">{token.description || "No description"}</p>
                  
                  <div className="flex gap-3 mt-4">
                    {token.twitter && (
                      <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {token.telegram && (
                      <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    )}
                    {token.website && (
                      <a href={token.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6">
              <h2 className="text-lg font-black text-red-500 mb-4">BONDING CURVE PROGRESS</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Progress to Raydium</span>
                  <span className="font-mono text-yellow-500">{token.bondingCurveProgress.toFixed(2)}%</span>
                </div>
                
                <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${token.bondingCurveProgress}%` }}
                    transition={{ duration: 1 }}
                    className={`h-full ${progressColor} rounded-full`}
                  />
                </div>
                
                <p className="text-xs text-gray-500 font-mono">
                  When the bonding curve reaches 100%, liquidity is deployed to Raydium DEX and LP tokens are burned.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">MARKET CAP</p>
                <p className="text-lg font-mono text-green-400">{token.marketCapSol.toFixed(2)} SOL</p>
              </div>
              <div className="bg-zinc-900 border border-yellow-600/30 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">PRICE</p>
                <p className="text-lg font-mono text-yellow-400">{token.priceInSol.toFixed(8)} SOL</p>
              </div>
              <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">CREATOR</p>
                <p className="text-sm font-mono text-gray-300 truncate">
                  {token.creatorAddress.slice(0, 6)}...{token.creatorAddress.slice(-4)}
                </p>
              </div>
              <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">CREATED</p>
                <p className="text-sm font-mono text-gray-300">
                  {new Date(token.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-yellow-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-lg font-black text-yellow-500">PREDICTION MARKETS</h2>
                </div>
                <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                  <button className="flex items-center gap-1 text-xs text-yellow-500 hover:text-yellow-400 font-bold bg-yellow-500/10 px-3 py-1.5 rounded">
                    <Plus className="w-3 h-3" />
                    CREATE
                  </button>
                </Link>
              </div>
              
              {token.predictions && token.predictions.length > 0 ? (
                <div className="space-y-3">
                  {token.predictions.map((prediction) => {
                    const timeLeft = new Date(prediction.resolutionDate).getTime() - Date.now();
                    const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
                    const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                    const isExpired = timeLeft <= 0;
                    
                    return (
                      <Link key={prediction.id} href={`/market/${prediction.id}`}>
                        <div 
                          className="bg-zinc-800/50 border border-yellow-500/20 rounded-lg p-4 hover:bg-zinc-800 hover:border-yellow-500/40 transition-all cursor-pointer"
                          data-testid={`prediction-${prediction.id}`}
                        >
                          <p className="font-bold text-white text-sm mb-2">{prediction.question}</p>
                          
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <button
                              className="bg-green-600/20 border border-green-600/40 rounded py-2 px-3 text-center hover:bg-green-600/30 transition-colors"
                              onClick={(e) => e.preventDefault()}
                            >
                              <span className="block text-green-400 font-black text-lg">{prediction.yesOdds}%</span>
                              <span className="block text-xs text-gray-400">YES</span>
                            </button>
                            <button
                              className="bg-red-600/20 border border-red-600/40 rounded py-2 px-3 text-center hover:bg-red-600/30 transition-colors"
                              onClick={(e) => e.preventDefault()}
                            >
                              <span className="block text-red-400 font-black text-lg">{prediction.noOdds}%</span>
                              <span className="block text-xs text-gray-400">NO</span>
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {prediction.totalVolume.toFixed(2)} SOL volume
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {prediction.status === "resolved" ? (
                                "RESOLVED"
                              ) : isExpired ? (
                                <span className="text-yellow-400">PENDING</span>
                              ) : daysLeft > 0 ? (
                                `${daysLeft}d ${hoursLeft}h`
                              ) : (
                                `${hoursLeft}h left`
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="w-10 h-10 text-yellow-500/30 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No prediction markets for this token yet</p>
                  <p className="text-gray-600 text-xs mt-1">Be the first to create one!</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-green-600/30 rounded-lg p-6">
              <h2 className="text-lg font-black text-green-500 mb-4">TRADE</h2>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTradeType("buy")}
                  data-testid="button-trade-buy"
                  className={`flex-1 py-2 px-4 rounded font-bold text-sm transition-all ${
                    tradeType === "buy" 
                      ? "bg-green-600 text-black" 
                      : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  BUY
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  data-testid="button-trade-sell"
                  className={`flex-1 py-2 px-4 rounded font-bold text-sm transition-all ${
                    tradeType === "sell" 
                      ? "bg-red-600 text-white" 
                      : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  SELL
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Amount ({tradeType === "buy" ? "SOL" : token.symbol})
                  </label>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 font-mono text-white focus:border-green-500 focus:outline-none"
                    data-testid="input-trade-amount"
                  />
                </div>
                
                <div className="flex gap-2">
                  {["0.1", "0.5", "1", "5"].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTradeAmount(amount)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-gray-300 text-xs py-1 rounded font-mono"
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                {/* Trading status message */}
                {!tradingStatus?.tradingEnabled && (
                  <div className="bg-yellow-900/20 border border-yellow-600/30 rounded p-3 mb-3">
                    <div className="flex items-center gap-2 justify-center">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <p className="text-yellow-500 text-xs font-bold">TRADING COMING SOON</p>
                    </div>
                    <p className="text-gray-400 text-xs text-center mt-1">
                      {tradingStatus?.message || "Deploy bonding curve contract to enable trading"}
                    </p>
                  </div>
                )}

                {/* Estimated value display */}
                {tradeAmount && Number(tradeAmount) > 0 && (
                  <div className="bg-zinc-800 rounded p-3 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">
                        {tradeType === "buy" ? "You pay:" : "You sell:"}
                      </span>
                      <span className="font-mono text-white">
                        {tradeAmount} {tradeType === "buy" ? "SOL" : token.symbol}
                      </span>
                    </div>
                    {tradeType === "buy" && solPrice && solPrice.price > 0 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">USD value:</span>
                        <span className="font-mono text-gray-300">
                          ${(Number(tradeAmount) * solPrice.price).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {tradeType === "buy" && (!solPrice || solPriceError) && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">USD value:</span>
                        <span className="font-mono text-gray-500 italic">
                          unavailable
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Connect wallet or trade buttons */}
                {!connectedWallet ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={connectWallet}
                    className="w-full py-3 rounded font-black uppercase transition-all bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                    data-testid="button-connect-wallet-trade"
                  >
                    CONNECT WALLET TO TRADE
                  </motion.button>
                ) : tradingStatus?.tradingEnabled ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!tradeAmount || Number(tradeAmount) <= 0}
                    className={`w-full py-3 rounded font-black uppercase transition-all ${
                      tradeType === "buy" 
                        ? "bg-green-600 hover:bg-green-700 disabled:bg-green-900" 
                        : "bg-red-600 hover:bg-red-700 disabled:bg-red-900"
                    } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                    data-testid={`button-${tradeType}-token`}
                  >
                    {tradeType === "buy" ? "BUY" : "SELL"} {token.symbol}
                  </motion.button>
                ) : (
                  <a
                    href={`https://pump.fun/coin/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded font-black uppercase transition-all bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex items-center justify-center gap-2"
                      data-testid="button-trade-on-pumpfun"
                    >
                      TRADE ON PUMP.FUN
                      <ExternalLink className="w-4 h-4" />
                    </motion.button>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6">
              <h2 className="text-lg font-black text-red-500 mb-4">TOKEN INFO</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Contract</span>
                  <a 
                    href={`https://solscan.io/token/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Supply</span>
                  <span className="font-mono text-gray-300">1B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-mono ${token.isGraduated ? "text-green-400" : "text-yellow-400"}`}>
                    {token.isGraduated ? "Graduated" : "Bonding"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
