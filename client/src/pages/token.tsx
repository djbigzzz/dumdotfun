import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Twitter, MessageCircle, Globe, Loader2, AlertCircle, Target, Clock, Users, Plus, X } from "lucide-react";
import { useState } from "react";
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
  const queryClient = useQueryClient();
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [activeBet, setActiveBet] = useState<{ predictionId: string; side: "yes" | "no" } | null>(null);
  const [betAmount, setBetAmount] = useState("");

  const placeBetMutation = useMutation({
    mutationFn: async ({ marketId, side, amount }: { marketId: string; side: "yes" | "no"; amount: number }) => {
      const res = await fetch(`/api/markets/${marketId}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: connectedWallet,
          side,
          amount,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place bet");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Bet placed! You received ${data.position?.shares?.toFixed(4) || "some"} shares`);
      setActiveBet(null);
      setBetAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleBetClick = (predictionId: string, side: "yes" | "no", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!connectedWallet) {
      connectWallet();
      return;
    }
    if (activeBet?.predictionId === predictionId && activeBet?.side === side) {
      setActiveBet(null);
      setBetAmount("");
    } else {
      setActiveBet({ predictionId, side });
      setBetAmount("");
    }
  };

  const handlePlaceBet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeBet || !betAmount) return;
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    placeBetMutation.mutate({
      marketId: activeBet.predictionId,
      side: activeBet.side,
      amount,
    });
  };

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
          <div className="animate-pulse text-gray-500 font-mono">Loading token...</div>
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-4">
          <p className="text-red-500 font-mono">Token not found</p>
          <Link href="/tokens">
            <button className="text-gray-500 hover:text-gray-900 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to tokens
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
        <Link href="/tokens">
          <button className="text-gray-500 hover:text-gray-900 flex items-center gap-2 text-sm font-mono">
            <ArrowLeft className="w-4 h-4" />
            Back to tokens
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-black overflow-hidden flex-shrink-0">
                  {token.imageUri ? (
                    <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-red-500 font-black text-2xl bg-gray-50">
                      {token.symbol[0]}
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-black text-gray-900">{token.name}</h1>
                    <span className="text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200">${token.symbol}</span>
                    {token.isGraduated && (
                      <span className="bg-green-100 border-2 border-green-500 px-2 py-0.5 rounded text-xs font-bold text-green-700">
                        GRADUATED
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mt-2 max-w-lg">{token.description || "No description"}</p>
                  
                  <div className="flex gap-3 mt-4">
                    {token.twitter && (
                      <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500">
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {token.telegram && (
                      <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500">
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    )}
                    {token.website && (
                      <a href={token.website} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500">
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-red-500 mb-4">BONDING CURVE PROGRESS</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress to Raydium</span>
                  <span className="font-mono text-yellow-600 font-bold">{token.bondingCurveProgress.toFixed(2)}%</span>
                </div>
                
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-black">
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
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs text-gray-500 mb-1 font-bold">MARKET CAP</p>
                <p className="text-lg font-mono text-green-600 font-bold">{token.marketCapSol.toFixed(2)} SOL</p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs text-gray-500 mb-1 font-bold">PRICE</p>
                <p className="text-lg font-mono text-yellow-600 font-bold">{token.priceInSol.toFixed(8)} SOL</p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs text-gray-500 mb-1 font-bold">CREATOR</p>
                <p className="text-sm font-mono text-gray-700 truncate">
                  {token.creatorAddress.slice(0, 6)}...{token.creatorAddress.slice(-4)}
                </p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs text-gray-500 mb-1 font-bold">CREATED</p>
                <p className="text-sm font-mono text-gray-700">
                  {new Date(token.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-black text-yellow-700">PREDICTION MARKETS</h2>
                </div>
                <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                  <motion.button 
                    whileHover={{ y: -1, x: -1 }}
                    className="flex items-center gap-1 text-xs text-yellow-700 font-bold bg-white px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Plus className="w-3 h-3" />
                    CREATE
                  </motion.button>
                </Link>
              </div>
              
              {token.predictions && token.predictions.length > 0 ? (
                <div className="space-y-3">
                  {token.predictions.map((prediction) => {
                    const timeLeft = new Date(prediction.resolutionDate).getTime() - Date.now();
                    const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
                    const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
                    const isExpired = timeLeft <= 0;
                    const isBettingActive = activeBet?.predictionId === prediction.id;
                    const canBet = prediction.status === "open" && !isExpired;
                    
                    return (
                      <div 
                        key={prediction.id}
                        className="bg-white border-2 border-black rounded-lg p-4 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        data-testid={`prediction-${prediction.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Link href={`/market/${prediction.id}`}>
                            <p className="font-bold text-gray-900 text-sm hover:text-yellow-700 cursor-pointer">{prediction.question}</p>
                          </Link>
                          {isBettingActive && (
                            <button 
                              onClick={(e) => { e.preventDefault(); setActiveBet(null); setBetAmount(""); }}
                              className="text-gray-400 hover:text-gray-600"
                              data-testid={`button-close-bet-${prediction.id}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <button
                            className={`border-2 rounded-lg py-2 px-3 text-center transition-all ${
                              isBettingActive && activeBet?.side === "yes"
                                ? "bg-green-500 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-green-100 border-green-500 hover:bg-green-200"
                            } ${!canBet ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            onClick={(e) => canBet && handleBetClick(prediction.id, "yes", e)}
                            disabled={!canBet}
                            data-testid={`button-bet-yes-${prediction.id}`}
                          >
                            <span className={`block font-black text-lg ${isBettingActive && activeBet?.side === "yes" ? "text-white" : "text-green-700"}`}>{prediction.yesOdds}%</span>
                            <span className={`block text-xs font-bold ${isBettingActive && activeBet?.side === "yes" ? "text-green-100" : "text-gray-600"}`}>YES</span>
                          </button>
                          <button
                            className={`border-2 rounded-lg py-2 px-3 text-center transition-all ${
                              isBettingActive && activeBet?.side === "no"
                                ? "bg-red-500 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                : "bg-red-100 border-red-500 hover:bg-red-200"
                            } ${!canBet ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            onClick={(e) => canBet && handleBetClick(prediction.id, "no", e)}
                            disabled={!canBet}
                            data-testid={`button-bet-no-${prediction.id}`}
                          >
                            <span className={`block font-black text-lg ${isBettingActive && activeBet?.side === "no" ? "text-white" : "text-red-700"}`}>{prediction.noOdds}%</span>
                            <span className={`block text-xs font-bold ${isBettingActive && activeBet?.side === "no" ? "text-red-100" : "text-gray-600"}`}>NO</span>
                          </button>
                        </div>

                        {isBettingActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-3 p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
                          >
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <input
                                  type="number"
                                  value={betAmount}
                                  onChange={(e) => setBetAmount(e.target.value)}
                                  placeholder="Amount in SOL"
                                  className="w-full px-3 py-2 text-sm border-2 border-black rounded-lg font-mono focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`input-bet-amount-${prediction.id}`}
                                />
                              </div>
                              <motion.button
                                whileHover={{ y: -1, x: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handlePlaceBet}
                                disabled={placeBetMutation.isPending || !betAmount}
                                className={`px-4 py-2 rounded-lg font-bold text-sm border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                                  activeBet?.side === "yes" 
                                    ? "bg-green-500 text-white hover:bg-green-600" 
                                    : "bg-red-500 text-white hover:bg-red-600"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                data-testid={`button-confirm-bet-${prediction.id}`}
                              >
                                {placeBetMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  `BET ${activeBet?.side?.toUpperCase()}`
                                )}
                              </motion.button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Click to bet on {activeBet?.side?.toUpperCase()} outcome
                            </p>
                          </motion.div>
                        )}
                        
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
                              <span className="text-yellow-600 font-bold">PENDING</span>
                            ) : daysLeft > 0 ? (
                              `${daysLeft}d ${hoursLeft}h`
                            ) : (
                              `${hoursLeft}h left`
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm font-medium">No prediction markets for this token yet</p>
                  <p className="text-gray-500 text-xs mt-1">Be the first to create one!</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-green-600 mb-4">TRADE</h2>
              
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTradeType("buy")}
                  data-testid="button-trade-buy"
                  className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all border-2 ${
                    tradeType === "buy" 
                      ? "bg-green-500 text-white border-black" 
                      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  BUY
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  data-testid="button-trade-sell"
                  className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all border-2 ${
                    tradeType === "sell" 
                      ? "bg-red-500 text-white border-black" 
                      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-1" />
                  SELL
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-600 block mb-1 font-bold">
                    Amount ({tradeType === "buy" ? "SOL" : token.symbol})
                  </label>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 focus:ring-2 focus:ring-green-500 focus:outline-none"
                    data-testid="input-trade-amount"
                  />
                </div>
                
                <div className="flex gap-2">
                  {["0.1", "0.5", "1", "5"].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTradeAmount(amount)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1.5 rounded-lg font-mono border border-gray-300"
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                {/* Trading status message */}
                {!tradingStatus?.tradingEnabled && (
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 justify-center">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <p className="text-yellow-700 text-xs font-bold">TRADING COMING SOON</p>
                    </div>
                    <p className="text-gray-600 text-xs text-center mt-1">
                      {tradingStatus?.message || "Deploy bonding curve contract to enable trading"}
                    </p>
                  </div>
                )}

                {/* Estimated value display */}
                {tradeAmount && Number(tradeAmount) > 0 && (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">
                        {tradeType === "buy" ? "You pay:" : "You sell:"}
                      </span>
                      <span className="font-mono text-gray-900 font-bold">
                        {tradeAmount} {tradeType === "buy" ? "SOL" : token.symbol}
                      </span>
                    </div>
                    {tradeType === "buy" && solPrice && solPrice.price > 0 && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-600">USD value:</span>
                        <span className="font-mono text-gray-700">
                          ${(Number(tradeAmount) * solPrice.price).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {tradeType === "buy" && (!solPrice || solPriceError) && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-600">USD value:</span>
                        <span className="font-mono text-gray-400 italic">
                          unavailable
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Connect wallet or trade buttons */}
                {!connectedWallet ? (
                  <motion.button
                    whileHover={{ y: -2, x: -2 }}
                    whileTap={{ y: 0, x: 0 }}
                    onClick={() => connectWallet()}
                    className="w-full py-3 rounded-lg font-black uppercase transition-all bg-red-500 hover:bg-red-600 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                    data-testid="button-connect-wallet-trade"
                  >
                    CONNECT WALLET TO TRADE
                  </motion.button>
                ) : tradingStatus?.tradingEnabled ? (
                  <motion.button
                    whileHover={{ y: -2, x: -2 }}
                    whileTap={{ y: 0, x: 0 }}
                    disabled={!tradeAmount || Number(tradeAmount) <= 0}
                    className={`w-full py-3 rounded-lg font-black uppercase transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                      tradeType === "buy" 
                        ? "bg-green-500 hover:bg-green-600" 
                        : "bg-red-500 hover:bg-red-600"
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
                      whileHover={{ y: -2, x: -2 }}
                      whileTap={{ y: 0, x: 0 }}
                      className="w-full py-3 rounded-lg font-black uppercase transition-all bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                      data-testid="button-trade-on-pumpfun"
                    >
                      TRADE ON PUMP.FUN
                      <ExternalLink className="w-4 h-4" />
                    </motion.button>
                  </a>
                )}
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-red-500 mb-4">TOKEN INFO</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract</span>
                  <a 
                    href={`https://solscan.io/token/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    {token.mint.slice(0, 6)}...{token.mint.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Supply</span>
                  <span className="font-mono text-gray-900">1B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`font-mono font-bold ${token.isGraduated ? "text-green-600" : "text-yellow-600"}`}>
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
