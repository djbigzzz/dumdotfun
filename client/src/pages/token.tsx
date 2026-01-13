import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { useIncoPrivacy, encryptBetForInco } from "@/lib/inco-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Twitter, MessageCircle, Globe, Loader2, AlertCircle, Target, Clock, Users, Plus, X, Activity, Lock, Shield } from "lucide-react";
import { useState } from "react";
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

interface TradingStatus {
  tradingEnabled: boolean;
  message: string;
  programId: string | null;
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
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const { connectedWallet, connectWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const { shouldEncryptBets, incoStatus } = useIncoPrivacy();
  const queryClient = useQueryClient();
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [activeBet, setActiveBet] = useState<{ predictionId: string; side: "yes" | "no" } | null>(null);
  const [betAmount, setBetAmount] = useState("");

  const placeBetMutation = useMutation({
    mutationFn: async ({ marketId, side, amount }: { marketId: string; side: "yes" | "no"; amount: number }) => {
      if (!connectedWallet) {
        throw new Error("Wallet not connected");
      }

      if (shouldEncryptBets) {
        console.log("[Inco] Placing confidential bet using Inco Lightning SDK");
        const encryptedPayload = await encryptBetForInco(amount, side, connectedWallet);
        
        const res = await fetch(`/api/markets/${marketId}/confidential-bet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: connectedWallet,
            side,
            amount,
            ...encryptedPayload,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to place confidential bet");
        }
        const result = await res.json();
        return { ...result, isConfidential: true };
      }

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
      if (data.isConfidential) {
        toast.success(`🔒 Confidential bet placed! Your amount is encrypted with Inco Lightning.`);
      } else {
        const shares = data.position?.shares ? parseFloat(data.position.shares).toFixed(4) : "some";
        toast.success(`Bet placed! You received ${shares} shares`);
      }
      setActiveBet(null);
      setBetAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const [isTrading, setIsTrading] = useState(false);

  const tradeMutation = useMutation({
    mutationFn: async ({ type, amount }: { type: "buy" | "sell"; amount: number }) => {
      if (!connectedWallet || !mint) {
        throw new Error("Wallet not connected");
      }

      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet required");
      }

      setIsTrading(true);

      const endpoint = type === "buy" ? "/api/bonding-curve/buy" : "/api/bonding-curve/sell";
      const body = type === "buy" 
        ? { buyer: connectedWallet, mint, solAmount: amount, minTokensOut: 0 }
        : { seller: connectedWallet, mint, tokenAmount: amount, minSolOut: 0 };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to build transaction");
      }

      const { transaction: txBase64 } = await res.json();
      
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      
      const signedTx = await phantom.signTransaction(transaction);
      
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(signature, "confirmed");
      
      return { signature, type, amount };
    },
    onSuccess: async (data) => {
      toast.success(`${data.type === "buy" ? "Bought" : "Sold"} successfully! TX: ${data.signature.slice(0, 8)}...`);
      
      try {
        await fetch("/api/bonding-curve/confirm-trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: connectedWallet,
            tokenMint: mint,
            side: data.type,
            amount: data.amount,
            signature: data.signature,
          }),
        });
      } catch (e) {
        console.error("Failed to log trade activity:", e);
      }
      
      setTradeAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
      queryClient.invalidateQueries({ queryKey: ["token-activity", mint] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsTrading(false);
    },
  });

  const handleTrade = () => {
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    tradeMutation.mutate({ type: tradeType, amount });
  };

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
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: tokenActivity } = useQuery<TokenActivity[]>({
    queryKey: ["token-activity", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/activity?limit=20`);
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
    refetchInterval: 30000,
  });

  const { data: tradeQuote } = useQuery<{ outputAmount: number; currentPrice: number } | null>({
    queryKey: ["trade-quote", mint, tradeType, tradeAmount],
    queryFn: async () => {
      if (!tradeAmount || Number(tradeAmount) <= 0) return null;
      const res = await fetch(`/api/bonding-curve/quote/${mint}?action=${tradeType}&amount=${tradeAmount}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!mint && !!tradeAmount && Number(tradeAmount) > 0,
    staleTime: 5000,
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

            <div className="bg-zinc-950 border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-white">PRICE CHART</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400 font-mono">{(token.priceInSol ?? 0).toFixed(8)} SOL</span>
                </div>
              </div>
              
              <div className="h-48">
                {priceHistory && priceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="time" 
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        stroke="#666"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => v.toExponential(1)}
                        stroke="#666"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#18181b', 
                          border: '2px solid #333',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        formatter={(value: number) => [value.toFixed(10) + ' SOL', 'Price']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        fill="url(#priceGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    Loading chart...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-lg font-black text-red-500 mb-4">BONDING CURVE PROGRESS</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress to Raydium</span>
                  <span className="font-mono text-yellow-600 font-bold">{(token.bondingCurveProgress ?? 0).toFixed(2)}%</span>
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
                <p className="text-lg font-mono text-green-600 font-bold">{(token.marketCapSol ?? 0).toFixed(2)} SOL</p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs text-gray-500 mb-1 font-bold">PRICE</p>
                <p className="text-lg font-mono text-yellow-600 font-bold">{(token.priceInSol ?? 0).toFixed(8)} SOL</p>
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

            <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-black text-gray-900">LIVE TRADES</h2>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-xs text-gray-500 font-mono">LIVE</span>
                </span>
              </div>
              
              {tokenActivity && tokenActivity.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tokenActivity.map((activity) => {
                    const isBuy = activity.side === "buy" || activity.activityType === "buy";
                    const amount = activity.amount ? parseFloat(activity.amount) : 0;
                    const timeAgo = getTimeAgo(new Date(activity.createdAt));
                    
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          isBuy 
                            ? "bg-green-50 border-green-300" 
                            : "bg-red-50 border-red-300"
                        }`}
                        data-testid={`trade-${activity.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {isBuy ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <div>
                            <p className={`font-bold text-sm ${isBuy ? "text-green-700" : "text-red-700"}`}>
                              {isBuy ? "BUY" : "SELL"}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {activity.walletAddress?.slice(0, 4)}...{activity.walletAddress?.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold ${isBuy ? "text-green-600" : "text-red-600"}`}>
                            {amount.toFixed(4)} SOL
                          </p>
                          <p className="text-xs text-gray-400">{timeAgo}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-mono">No trades yet</p>
                  <p className="text-xs">Be the first to trade!</p>
                </div>
              )}
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
                            className={`mb-3 p-3 border-2 border-dashed rounded-lg ${
                              shouldEncryptBets 
                                ? "bg-zinc-900 border-green-500" 
                                : "bg-gray-50 border-gray-300"
                            }`}
                          >
                            {shouldEncryptBets && (
                              <div className="flex items-center gap-2 mb-2 text-green-400 text-xs font-mono">
                                <Shield className="w-3 h-3" />
                                <span>INCO LIGHTNING CONFIDENTIAL</span>
                                <Lock className="w-3 h-3" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <input
                                  type="number"
                                  value={betAmount}
                                  onChange={(e) => setBetAmount(e.target.value)}
                                  placeholder={shouldEncryptBets ? "🔒 Amount (encrypted)" : "Amount in SOL"}
                                  className={`w-full px-3 py-2 text-sm border-2 rounded-lg font-mono focus:ring-2 focus:outline-none ${
                                    shouldEncryptBets 
                                      ? "bg-zinc-800 border-green-500 text-green-400 placeholder-green-600 focus:ring-green-500" 
                                      : "border-black focus:ring-yellow-400"
                                  }`}
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
                                  shouldEncryptBets
                                    ? "bg-green-500 text-black hover:bg-green-400"
                                    : activeBet?.side === "yes" 
                                      ? "bg-green-500 text-white hover:bg-green-600" 
                                      : "bg-red-500 text-white hover:bg-red-600"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                data-testid={`button-confirm-bet-${prediction.id}`}
                              >
                                {placeBetMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : shouldEncryptBets ? (
                                  <span className="flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    PRIVATE
                                  </span>
                                ) : (
                                  `BET ${activeBet?.side?.toUpperCase()}`
                                )}
                              </motion.button>
                            </div>
                            <p className={`text-xs mt-2 text-center ${shouldEncryptBets ? "text-green-500" : "text-gray-500"}`}>
                              {shouldEncryptBets 
                                ? "Your bet amount will be encrypted on-chain" 
                                : `Click to bet on ${activeBet?.side?.toUpperCase()} outcome`}
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
                    {tradeQuote && tradeQuote.outputAmount > 0 && (
                      <div className="flex justify-between text-xs mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-600 font-bold">
                          {tradeType === "buy" ? "You receive:" : "You get:"}
                        </span>
                        <span className="font-mono text-green-600 font-bold">
                          {tradeType === "buy" 
                            ? `~${tradeQuote.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token.symbol}`
                            : `~${tradeQuote.outputAmount.toFixed(6)} SOL`
                          }
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
                    onClick={handleTrade}
                    disabled={!tradeAmount || Number(tradeAmount) <= 0 || isTrading}
                    className={`w-full py-3 rounded-lg font-black uppercase transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                      tradeType === "buy" 
                        ? "bg-green-500 hover:bg-green-600" 
                        : "bg-red-500 hover:bg-red-600"
                    } text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    data-testid={`button-${tradeType}-token`}
                  >
                    {isTrading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        SIGNING...
                      </>
                    ) : (
                      <>{tradeType === "buy" ? "BUY" : "SELL"} {token.symbol}</>
                    )}
                  </motion.button>
                ) : (
                  <motion.button
                    disabled
                    className="w-full py-3 rounded-lg font-black uppercase transition-all bg-gray-400 text-white flex items-center justify-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-not-allowed opacity-70"
                    data-testid="button-trading-coming-soon"
                  >
                    TRADING COMING SOON
                  </motion.button>
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
