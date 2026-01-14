import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { useIncoPrivacy, encryptBetForInco } from "@/lib/inco-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Twitter, MessageCircle, Globe, Loader2, Target, Plus, Copy, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Buffer } from "buffer";
import { Connection, Transaction } from "@solana/web3.js";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

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

interface SolPrice {
  price: number;
  currency: string;
}

interface TokenActivity {
  id: string;
  activityType: string;
  walletAddress: string | null;
  tokenMint: string | null;
  amount: string | null;
  side: string | null;
  metadata: string | null;
  createdAt: string;
}

interface PricePoint {
  time: number;
  price: number;
  volume: number;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price < 0.00000001) {
    return `$${price.toExponential(2)}`;
  }
  if (price < 0.0001) {
    return `$${price.toFixed(8)}`;
  }
  return `$${price.toFixed(6)}`;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) {
    return `$${(usdValue / 1000000).toFixed(2)}M`;
  } else if (usdValue && usdValue >= 1000) {
    return `$${(usdValue / 1000).toFixed(1)}K`;
  } else if (usdValue) {
    return `$${usdValue.toFixed(0)}`;
  }
  return `${mcSol.toFixed(2)} SOL`;
}

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const { connectedWallet, connectWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const { shouldEncryptBets } = useIncoPrivacy();
  const queryClient = useQueryClient();
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [activeBet, setActiveBet] = useState<{ predictionId: string; side: "yes" | "no" } | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [chartInterval, setChartInterval] = useState<"1m" | "5m" | "1h" | "all">("all");
  const [copied, setCopied] = useState(false);

  const { data: token, isLoading, error } = useQuery<TokenDetail>({
    queryKey: ["token", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}`);
      if (!res.ok) throw new Error("Failed to fetch token");
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });

  const { data: solPrice } = useQuery<SolPrice>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/sol-price");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: tokenActivity } = useQuery<TokenActivity[]>({
    queryKey: ["token-activity", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/activity`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 5000,
  });

  const { data: priceHistory } = useQuery<PricePoint[]>({
    queryKey: ["price-history", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/price-history`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });

  const placeBetMutation = useMutation({
    mutationFn: async ({ marketId, side, amount }: { marketId: string; side: "yes" | "no"; amount: number }) => {
      if (!connectedWallet) throw new Error("Wallet not connected");
      const res = await fetch(`/api/markets/${marketId}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: connectedWallet, side, amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to place bet");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Bet placed!");
      setActiveBet(null);
      setBetAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredPriceHistory = useMemo(() => {
    if (!priceHistory) return [];
    const now = Date.now();
    switch (chartInterval) {
      case "1m": return priceHistory.filter(p => now - p.time < 60000);
      case "5m": return priceHistory.filter(p => now - p.time < 300000);
      case "1h": return priceHistory.filter(p => now - p.time < 3600000);
      default: return priceHistory;
    }
  }, [priceHistory, chartInterval]);

  const handleQuickBuy = (amount: number) => {
    setTradeAmount(amount.toString());
    setTradeType("buy");
  };

  const handleCopyAddress = () => {
    if (token) {
      navigator.clipboard.writeText(token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBetClick = (predictionId: string, side: "yes" | "no", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeBet?.predictionId === predictionId && activeBet?.side === side) {
      setActiveBet(null);
    } else {
      setActiveBet({ predictionId, side });
      setBetAmount("");
    }
  };

  const handlePlaceBet = () => {
    if (!activeBet || !betAmount) return;
    placeBetMutation.mutate({
      marketId: activeBet.predictionId,
      side: activeBet.side,
      amount: parseFloat(betAmount),
    });
  };

  const handleTrade = async () => {
    if (!connectedWallet || !tradeAmount || !token) {
      toast.error("Please connect wallet and enter amount");
      return;
    }
    toast.info(`${tradeType === "buy" ? "Buying" : "Selling"} ${tradeAmount} SOL worth of ${token.symbol}...`);
  };

  const marketCapUsd = useMemo(() => {
    if (!token || !solPrice) return null;
    return token.marketCapSol * solPrice.price;
  }, [token, solPrice]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">Token not found</p>
        <Link href="/tokens">
          <button className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to tokens
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Back Button */}
        <Link href="/tokens">
          <button className="text-gray-400 hover:text-white flex items-center gap-2 text-sm mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Token Header */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#2a2a2a] overflow-hidden flex-shrink-0">
                  {token.imageUri ? (
                    <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-green-400 font-bold text-lg">
                      {token.symbol[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-lg">{token.name}</span>
                    <span className="text-gray-500 text-sm bg-[#2a2a2a] px-2 py-0.5 rounded">${token.symbol}</span>
                    <button 
                      onClick={handleCopyAddress}
                      className="text-gray-500 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {token.mint.slice(0, 6)}...
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>by {token.creatorAddress.slice(0, 6)}</span>
                    <span>{getTimeAgo(new Date(token.createdAt))} ago</span>
                    <div className="flex items-center gap-2">
                      {token.twitter && (
                        <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                          <Twitter className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {token.telegram && (
                        <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {token.website && (
                        <a href={token.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Cap Display */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="text-gray-500 text-xs mb-1">Market Cap</div>
              <div className="text-3xl font-bold text-white">
                {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="h-64">
                {filteredPriceHistory && filteredPriceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredPriceHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        stroke="#444"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => formatPrice(v * (solPrice?.price || 200))}
                        stroke="#444"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={60}
                        orientation="right"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        formatter={(value: number) => [formatPrice(value * (solPrice?.price || 200)), 'Price']}
                      />
                      <Area type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={2} fill="url(#chartGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    No price data yet
                  </div>
                )}
              </div>
              
              {/* Chart Interval Buttons */}
              <div className="flex items-center gap-2 mt-3">
                {(["1m", "5m", "1h", "all"] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setChartInterval(interval)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      chartInterval === interval
                        ? "bg-white text-black"
                        : "bg-[#2a2a2a] text-gray-400 hover:text-white"
                    }`}
                    data-testid={`button-interval-${interval}`}
                  >
                    {interval === "all" ? "All" : interval.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                <div className="text-gray-500 text-xs">Price</div>
                <div className="text-white font-mono text-sm">{formatPrice(token.priceInSol * (solPrice?.price || 200))}</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                <div className="text-gray-500 text-xs">Vol 24h</div>
                <div className="text-white font-mono text-sm">{token.marketCapSol.toFixed(1)} SOL</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                <div className="text-gray-500 text-xs">Holders</div>
                <div className="text-white font-mono text-sm">-</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 text-center">
                <div className="text-gray-500 text-xs">Txns</div>
                <div className="text-white font-mono text-sm">{tokenActivity?.length || 0}</div>
              </div>
            </div>

            {/* Trades */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="text-white font-medium mb-3">Trades</div>
              {tokenActivity && tokenActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                        <th className="text-left py-2">Account</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-right py-2">Amount (SOL)</th>
                        <th className="text-right py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenActivity.slice(0, 10).map((activity) => {
                        const isBuy = activity.side === "buy" || activity.activityType === "buy";
                        const amount = activity.amount ? parseFloat(activity.amount) : 0;
                        return (
                          <tr key={activity.id} className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/50">
                            <td className="py-2 text-gray-400">{activity.walletAddress?.slice(0, 6)}...</td>
                            <td className={`py-2 ${isBuy ? "text-green-500" : "text-red-500"}`}>
                              {isBuy ? "Buy" : "Sell"}
                            </td>
                            <td className="py-2 text-right text-white">{amount.toFixed(4)}</td>
                            <td className="py-2 text-right text-gray-500">{getTimeAgo(new Date(activity.createdAt))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No trades yet</div>
              )}
            </div>

            {/* Predictions Section */}
            {token.predictions && token.predictions.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-yellow-500 font-medium">
                    <Target className="w-4 h-4" />
                    Prediction Markets
                  </div>
                  <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                    <button className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 px-2 py-1 rounded" data-testid="button-create-market">
                      <Plus className="w-3 h-3 inline" /> Create
                    </button>
                  </Link>
                </div>
                {token.predictions.slice(0, 3).map((prediction) => {
                  const isBettingActive = activeBet?.predictionId === prediction.id;
                  return (
                    <div key={prediction.id} className="bg-[#0d0d0d] rounded p-3 mb-2" data-testid={`prediction-${prediction.id}`}>
                      <Link href={`/market/${prediction.id}`}>
                        <p className="text-white text-sm mb-2 hover:text-yellow-500">{prediction.question}</p>
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => handleBetClick(prediction.id, "yes", e)}
                          className={`py-2 rounded text-center transition-all ${
                            isBettingActive && activeBet?.side === "yes"
                              ? "bg-green-500 text-white"
                              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          }`}
                          data-testid={`button-bet-yes-${prediction.id}`}
                        >
                          <span className="block font-bold">{prediction.yesOdds}%</span>
                          <span className="text-xs">YES</span>
                        </button>
                        <button
                          onClick={(e) => handleBetClick(prediction.id, "no", e)}
                          className={`py-2 rounded text-center transition-all ${
                            isBettingActive && activeBet?.side === "no"
                              ? "bg-red-500 text-white"
                              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                          data-testid={`button-bet-no-${prediction.id}`}
                        >
                          <span className="block font-bold">{prediction.noOdds}%</span>
                          <span className="text-xs">NO</span>
                        </button>
                      </div>
                      {isBettingActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2 flex gap-2"
                        >
                          <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(e.target.value)}
                            placeholder="SOL amount"
                            className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded px-3 py-2 text-sm text-white"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`input-bet-amount-${prediction.id}`}
                          />
                          <button
                            onClick={handlePlaceBet}
                            disabled={placeBetMutation.isPending}
                            className={`px-4 py-2 rounded font-bold text-sm ${
                              activeBet?.side === "yes" ? "bg-green-500" : "bg-red-500"
                            } text-white`}
                            data-testid={`button-confirm-bet-${prediction.id}`}
                          >
                            {placeBetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "BET"}
                          </button>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column - Trade Panel */}
          <div className="space-y-4">
            {/* Buy/Sell Panel */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 sticky top-4">
              {/* Buy/Sell Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTradeType("buy")}
                  className={`flex-1 py-2 rounded font-bold transition-all ${
                    tradeType === "buy"
                      ? "bg-green-500 text-white"
                      : "bg-[#2a2a2a] text-gray-400 hover:text-white"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  className={`flex-1 py-2 rounded font-bold transition-all ${
                    tradeType === "sell"
                      ? "bg-red-500 text-white"
                      : "bg-[#2a2a2a] text-gray-400 hover:text-white"
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Amount Input */}
              <div className="relative mb-3">
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white text-lg font-mono focus:outline-none focus:border-green-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">SOL</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {["0.1", "0.5", "1", "Max"].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => amt === "Max" ? setTradeAmount("1") : setTradeAmount(amt)}
                    className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 hover:text-white text-xs py-2 rounded transition-all"
                  >
                    {amt === "Max" ? amt : `${amt} SOL`}
                  </button>
                ))}
              </div>

              {/* Action Button */}
              {!connectedWallet ? (
                <button
                  onClick={() => connectWallet()}
                  className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg transition-all"
                  data-testid="button-connect-wallet"
                >
                  Connect Wallet
                </button>
              ) : (
                <button
                  onClick={handleTrade}
                  disabled={!tradeAmount || Number(tradeAmount) <= 0}
                  className={`w-full font-bold py-3 rounded-lg transition-all disabled:opacity-50 ${
                    tradeType === "buy"
                      ? "bg-green-500 hover:bg-green-400 text-black"
                      : "bg-red-500 hover:bg-red-400 text-white"
                  }`}
                  data-testid="button-trade"
                >
                  {tradeType === "buy" ? "Buy" : "Sell"} {token.symbol}
                </button>
              )}
            </div>

            {/* Bonding Curve Progress */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Bonding Curve Progress</span>
                <span className="text-white font-bold">{token.bondingCurveProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{token.virtualSolReserves?.toFixed(2) || 0} SOL in curve</span>
                <span>85 SOL to graduate</span>
              </div>
            </div>

            {/* Token Description */}
            {token.description && (
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">About</div>
                <p className="text-gray-300 text-sm">{token.description}</p>
              </div>
            )}

            {/* Links */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <a 
                href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-gray-400 hover:text-white py-2 border-b border-[#2a2a2a]"
              >
                <span>View on Solscan</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a 
                href={`https://birdeye.so/token/${token.mint}?chain=solana`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-gray-400 hover:text-white py-2"
              >
                <span>View on Birdeye</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
