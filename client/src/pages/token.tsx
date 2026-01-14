import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { useIncoPrivacy, encryptBetForInco } from "@/lib/inco-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link } from "wouter";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Twitter, MessageCircle, Globe, Loader2, AlertCircle, Target, Clock, Users, Plus, X, Activity, Lock, Shield, ChevronDown, ArrowUpDown, Heart } from "lucide-react";
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

interface TokenListItem {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  marketCapSol: number;
  priceInSol: number;
  bondingCurveProgress: number;
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

function formatPrice(price: number): string {
  if (price < 0.000001) {
    const str = price.toFixed(12);
    const match = str.match(/0\.(0+)(\d+)/);
    if (match) {
      const zeros = match[1].length;
      const digits = match[2].slice(0, 6);
      return `0.0₍${zeros}₎${digits}`;
    }
  }
  return price.toFixed(8);
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000) {
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
  const { shouldEncryptBets, incoStatus } = useIncoPrivacy();
  const queryClient = useQueryClient();
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [activeBet, setActiveBet] = useState<{ predictionId: string; side: "yes" | "no" } | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [chartInterval, setChartInterval] = useState<"tick" | "1m" | "5m" | "all">("all");
  const [showAbout, setShowAbout] = useState(false);

  const placeBetMutation = useMutation({
    mutationFn: async ({ marketId, side, amount }: { marketId: string; side: "yes" | "no"; amount: number }) => {
      if (!connectedWallet) {
        throw new Error("Wallet not connected");
      }

      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet required");
      }

      if (shouldEncryptBets) {
        console.log("[Inco] Placing confidential bet using Inco Lightning SDK");
        const encryptedPayload = await encryptBetForInco(amount, side, connectedWallet);
        
        const prepareRes = await fetch(`/api/markets/${marketId}/prepare-bet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: connectedWallet,
            side,
            amount,
            ...encryptedPayload,
          }),
        });
        if (!prepareRes.ok) {
          const data = await prepareRes.json();
          throw new Error(data.error || "Failed to prepare confidential bet");
        }
        const { transaction: txBase64, betId } = await prepareRes.json();
        
        const txBytes = Buffer.from(txBase64, "base64");
        const transaction = Transaction.from(txBytes);
        const signedTx = await phantom.signTransaction(transaction);
        
        const connection = new Connection(SOLANA_RPC, "confirmed");
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
        await connection.confirmTransaction(signature, "confirmed");
        
        const confirmRes = await fetch(`/api/markets/${marketId}/confirm-bet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ betId, signature, ...encryptedPayload }),
        });
        if (!confirmRes.ok) {
          const data = await confirmRes.json();
          throw new Error(data.error || "Failed to confirm bet");
        }
        const result = await confirmRes.json();
        return { ...result, isConfidential: true, signature };
      }

      const prepareRes = await fetch(`/api/markets/${marketId}/prepare-bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: connectedWallet,
          side,
          amount,
        }),
      });
      if (!prepareRes.ok) {
        const data = await prepareRes.json();
        throw new Error(data.error || "Failed to prepare bet");
      }
      const { transaction: txBase64, betId } = await prepareRes.json();
      
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      const signedTx = await phantom.signTransaction(transaction);
      
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(signature, "confirmed");
      
      const confirmRes = await fetch(`/api/markets/${marketId}/confirm-bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betId, signature }),
      });
      if (!confirmRes.ok) {
        const data = await confirmRes.json();
        throw new Error(data.error || "Failed to confirm bet");
      }
      return confirmRes.json();
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

  const handleQuickBuy = (amount: number) => {
    if (!connectedWallet) {
      connectWallet();
      return;
    }
    setTradeAmount(amount.toString());
    setTradeType("buy");
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
    refetchInterval: 3000,
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

  const { data: otherTokens } = useQuery<TokenListItem[]>({
    queryKey: ["other-tokens", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens?limit=5`);
      if (!res.ok) return [];
      const tokens = await res.json();
      return tokens.filter((t: TokenListItem) => t.mint !== mint).slice(0, 3);
    },
    enabled: !!mint,
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

  const filteredPriceHistory = useMemo(() => {
    if (!priceHistory) return [];
    const now = Date.now();
    switch (chartInterval) {
      case "1m":
        return priceHistory.filter(p => now - p.time < 60000);
      case "5m":
        return priceHistory.filter(p => now - p.time < 300000);
      case "tick":
        return priceHistory.slice(-20);
      default:
        return priceHistory;
    }
  }, [priceHistory, chartInterval]);

  const marketCapUsd = useMemo(() => {
    if (!token || !solPrice) return null;
    return token.marketCapSol * solPrice.price;
  }, [token, solPrice]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className={`animate-pulse font-mono ${privateMode ? "text-[#39FF14]" : "text-gray-500"}`}>
            {privateMode ? "> LOADING_TOKEN..." : "Loading token..."}
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-4">
          <p className={`font-mono ${privateMode ? "text-[#39FF14]" : "text-red-500"}`}>
            {privateMode ? "> TOKEN_NOT_FOUND" : "Token not found"}
          </p>
          <Link href="/tokens">
            <button className={`flex items-center gap-2 ${privateMode ? "text-[#39FF14]/70 hover:text-[#39FF14]" : "text-gray-500 hover:text-gray-700"}`}>
              <ArrowLeft className="w-4 h-4" />
              Back to tokens
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-24 lg:pb-0">
        <Link href="/tokens">
          <button className={`flex items-center gap-2 text-sm mb-4 ${privateMode ? "text-[#39FF14]/70 hover:text-[#39FF14]" : "text-gray-500 hover:text-gray-700"}`} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
            Back to tokens
          </button>
        </Link>

        {/* Token Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 border-2 ${
            privateMode 
              ? "bg-black border-[#39FF14]" 
              : "bg-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
              privateMode ? "bg-black border-[#39FF14]/30" : "bg-gray-100 border-black"
            }`}>
              {token.imageUri ? (
                <img src={token.imageUri} alt={token.name} className={`w-full h-full object-cover ${privateMode ? "opacity-80 sepia brightness-90 saturate-150 hue-rotate-60" : ""}`} />
              ) : (
                <div className={`w-full h-full flex items-center justify-center font-black text-xl ${
                  privateMode ? "bg-black text-[#39FF14]" : "bg-gray-50 text-red-500"
                }`}>
                  {token.symbol[0]}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className={`text-2xl font-black uppercase ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-900"}`}>
                  {token.name}
                </h1>
                <span className={`text-sm font-mono px-2 py-0.5 rounded border ${
                  privateMode ? "bg-black text-[#39FF14]/50 border-[#39FF14]/20" : "bg-gray-100 text-gray-500 border-gray-200"
                }`}>
                  ${token.symbol}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {token.twitter && (
                  <a href={token.twitter} target="_blank" rel="noopener noreferrer" className={privateMode ? "text-[#39FF14]/50 hover:text-[#39FF14]" : "text-gray-400 hover:text-gray-600"}>
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {token.telegram && (
                  <a href={token.telegram} target="_blank" rel="noopener noreferrer" className={privateMode ? "text-[#39FF14]/50 hover:text-[#39FF14]" : "text-gray-400 hover:text-gray-600"}>
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {token.website && (
                  <a href={token.website} target="_blank" rel="noopener noreferrer" className={privateMode ? "text-[#39FF14]/50 hover:text-[#39FF14]" : "text-gray-400 hover:text-gray-600"}>
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className={`text-2xl font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
                {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
              </div>
              <div className={`text-xs font-mono ${privateMode ? "text-[#39FF14]" : "text-green-600"}`}>
                {token.bondingCurveProgress.toFixed(1)}% bonded
              </div>
            </div>
          </div>

          {/* Bonding Curve Progress */}
          <div className="mt-4">
            <div className={`h-2 rounded-full overflow-hidden border ${
              privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-200 border-gray-300"
            }`}>
              <div 
                className={`h-full transition-all ${
                  privateMode 
                    ? "bg-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.5)]" 
                    : token.bondingCurveProgress > 80 ? "bg-green-500" : token.bondingCurveProgress > 50 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Price Chart Card */}
        <div className={`p-4 border-2 ${
          privateMode 
            ? "bg-black border-[#39FF14]" 
            : "bg-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        }`}>
          <div className="h-48 relative">
            {filteredPriceHistory && filteredPriceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredPriceHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="priceGradientPump" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={privateMode ? "#39FF14" : "#22c55e"} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={privateMode ? "#39FF14" : "#22c55e"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    stroke={privateMode ? "#39FF14" : "#888"}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `$${(v * (solPrice?.price || 200)).toFixed(0)}`}
                    stroke={privateMode ? "#39FF14" : "#888"}
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    orientation="right"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: privateMode ? '#000' : '#fff', 
                      border: privateMode ? '1px solid #39FF14' : '2px solid #000',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: privateMode ? '#39FF14' : '#000'
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                    formatter={(value: number) => [`${value.toFixed(10)} SOL`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={privateMode ? "#39FF14" : "#22c55e"}
                    strokeWidth={2}
                    fill="url(#priceGradientPump)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex items-center justify-center text-sm ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`}>
                No price history yet
              </div>
            )}
          </div>

          <div className={`flex items-center gap-3 mt-3 text-xs font-mono ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
            <span>Price: {formatPrice(token.priceInSol)}</span>
            <span>•</span>
            <span>Cap: {token.marketCapSol.toFixed(3)} SOL</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {["Tick", "1m", "5m", "All"].map((interval) => (
              <button
                key={interval}
                onClick={() => setChartInterval(interval.toLowerCase() as any)}
                className={`px-3 py-1.5 text-sm font-bold transition-all border ${
                  chartInterval === interval.toLowerCase()
                    ? privateMode 
                      ? "bg-[#39FF14] text-black border-[#39FF14]"
                      : "bg-black text-white border-black"
                    : privateMode
                      ? "bg-black text-[#39FF14]/70 border-[#39FF14]/30 hover:border-[#39FF14]"
                      : "bg-white text-gray-500 border-gray-300 hover:border-black"
                }`}
                data-testid={`button-interval-${interval.toLowerCase()}`}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Buy Buttons */}
        <div className="flex gap-3">
          {[0.05, 0.1, 0.2].map((amount) => (
            <motion.button
              key={amount}
              whileHover={{ y: -2, x: -2 }}
              whileTap={{ y: 0, x: 0 }}
              onClick={() => handleQuickBuy(amount)}
              className={`flex-1 font-bold py-3 border-2 transition-all ${
                privateMode
                  ? "bg-black border-[#39FF14] text-[#39FF14] hover:shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                  : "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-lg"
              }`}
              data-testid={`button-quick-buy-${amount}`}
            >
              {privateMode ? `◈ ${amount}` : `${amount} ◎`}
            </motion.button>
          ))}
        </div>

        {/* Trade Display */}
        <div className={`flex items-center justify-between p-3 border-2 ${
          privateMode 
            ? "bg-black border-[#39FF14]/30 text-[#39FF14]" 
            : "bg-gray-50 border-gray-200 rounded-lg"
        }`}>
          <span className={`font-mono ${privateMode ? "text-white" : "text-gray-900"}`}>
            {tradeQuote ? `$${(Number(tradeAmount) * (solPrice?.price || 200)).toFixed(2)}` : "$0.00"}
          </span>
          <span className={`font-mono text-sm ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
            ≈ {tradeAmount || "0"} SOL
          </span>
        </div>

        {/* About Section */}
        <div className={`p-4 border-2 ${
          privateMode 
            ? "bg-black border-[#39FF14]/50" 
            : "bg-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        }`}>
          <button 
            onClick={() => setShowAbout(!showAbout)}
            className="flex items-center gap-2 w-full text-left"
            data-testid="button-toggle-about"
          >
            <span className={`font-bold ${privateMode ? "text-[#39FF14]" : "text-gray-900"}`}>
              {privateMode ? "> ABOUT" : "About"}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${privateMode ? "text-[#39FF14]" : "text-gray-500"} ${showAbout ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {showAbout && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 border ${privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-50 border-gray-200 rounded"}`}>
                    <div className={`text-lg font-mono ${privateMode ? "text-white" : "text-gray-900"}`}>{formatPrice(token.priceInSol)}</div>
                    <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>Price</div>
                  </div>
                  <div className={`p-3 border ${privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-50 border-gray-200 rounded"}`}>
                    <div className={`text-lg font-mono ${privateMode ? "text-white" : "text-gray-900"}`}>
                      {marketCapUsd ? `$${(marketCapUsd / 1000).toFixed(1)}K` : `${token.marketCapSol.toFixed(1)} SOL`}
                    </div>
                    <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>Market Cap</div>
                  </div>
                </div>
                {token.description && (
                  <p className={`text-sm ${privateMode ? "text-[#39FF14]/80" : "text-gray-600"}`}>{token.description}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Token Info Card */}
        <div className={`p-4 border-2 ${
          privateMode 
            ? "bg-black border-[#39FF14]/50" 
            : "bg-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        }`}>
          <h3 className={`flex items-center gap-2 font-bold mb-3 ${privateMode ? "text-[#39FF14]" : "text-gray-900"}`}>
            <Users className="w-4 h-4" />
            {privateMode ? "> TOKEN_INFO" : "Token Info"}
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className={`p-3 border ${privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-50 border-gray-200 rounded"}`}>
              <div className={`text-sm font-mono truncate ${privateMode ? "text-white" : "text-gray-900"}`}>
                {token.creatorAddress.slice(0, 6)}...{token.creatorAddress.slice(-4)}
              </div>
              <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>Creator</div>
            </div>
            <div className={`p-3 border ${privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-50 border-gray-200 rounded"}`}>
              <div className={`text-sm font-mono ${privateMode ? "text-white" : "text-gray-900"}`}>
                {new Date(token.createdAt).toLocaleDateString()}
              </div>
              <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>Created</div>
            </div>
            <div className={`p-3 border ${privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-50 border-gray-200 rounded"}`}>
              <div className={`text-sm font-mono ${privateMode ? "text-white" : "text-gray-900"}`}>
                {token.isGraduated ? "Graduated" : "Bonding"}
              </div>
              <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>Status</div>
            </div>
            <div className={`p-3 border ${privateMode ? "bg-black border-[#39FF14]/20" : "bg-gray-50 border-gray-200 rounded"}`}>
              <a 
                href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-sm font-mono flex items-center justify-center gap-1 ${
                  privateMode ? "text-[#39FF14] hover:text-white" : "text-red-500 hover:text-red-600"
                }`}
              >
                Solscan <ExternalLink className="w-3 h-3" />
              </a>
              <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>Explorer</div>
            </div>
          </div>
        </div>

        {/* Predictions Section */}
        {token.predictions && token.predictions.length > 0 && (
          <div className={`p-4 border-2 ${
            privateMode 
              ? "bg-black border-yellow-500" 
              : "bg-yellow-50 border-yellow-500 rounded-lg shadow-[4px_4px_0px_0px_rgba(234,179,8,1)]"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`flex items-center gap-2 font-bold ${privateMode ? "text-yellow-400" : "text-yellow-700"}`}>
                <Target className="w-4 h-4" />
                {privateMode ? "> PREDICTIONS" : "Predictions"}
              </h3>
              <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                <button className={`text-xs px-2 py-1 border font-bold ${
                  privateMode 
                    ? "bg-black border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
                    : "bg-yellow-500 border-black text-black hover:bg-yellow-400"
                }`} data-testid="button-create-market">
                  <Plus className="w-3 h-3 inline" /> Create
                </button>
              </Link>
            </div>
            {token.predictions.slice(0, 2).map((prediction) => {
              const isBettingActive = activeBet?.predictionId === prediction.id;
              return (
                <div key={prediction.id} className={`p-3 mb-2 border ${
                  privateMode ? "bg-black border-yellow-500/30" : "bg-white border-gray-200 rounded"
                }`} data-testid={`prediction-${prediction.id}`}>
                  <Link href={`/market/${prediction.id}`}>
                    <p className={`text-sm mb-2 ${privateMode ? "text-white hover:text-yellow-400" : "text-gray-900 hover:text-yellow-600"}`}>
                      {prediction.question}
                    </p>
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => handleBetClick(prediction.id, "yes", e)}
                      className={`py-2 text-center transition-all border font-bold ${
                        isBettingActive && activeBet?.side === "yes"
                          ? "bg-green-500 text-white border-green-500"
                          : privateMode 
                            ? "bg-black border-green-500/50 text-green-400 hover:border-green-500"
                            : "bg-green-100 border-green-500 text-green-700 hover:bg-green-200"
                      }`}
                      data-testid={`button-bet-yes-${prediction.id}`}
                    >
                      <span className="block font-bold">{prediction.yesOdds}%</span>
                      <span className="text-xs">YES</span>
                    </button>
                    <button
                      onClick={(e) => handleBetClick(prediction.id, "no", e)}
                      className={`py-2 text-center transition-all border font-bold ${
                        isBettingActive && activeBet?.side === "no"
                          ? "bg-red-500 text-white border-red-500"
                          : privateMode 
                            ? "bg-black border-red-500/50 text-red-400 hover:border-red-500"
                            : "bg-red-100 border-red-500 text-red-700 hover:bg-red-200"
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
                        className={`flex-1 px-3 py-2 text-sm border-2 ${
                          privateMode 
                            ? "bg-black border-[#39FF14]/50 text-[#39FF14]" 
                            : "bg-white border-black"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`input-bet-amount-${prediction.id}`}
                      />
                      <button
                        onClick={handlePlaceBet}
                        disabled={placeBetMutation.isPending}
                        className={`px-4 py-2 font-bold text-sm border-2 ${
                          activeBet?.side === "yes" 
                            ? "bg-green-500 border-green-600 text-white" 
                            : "bg-red-500 border-red-600 text-white"
                        }`}
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

        {/* Activity Section */}
        <div className={`p-4 border-2 ${
          privateMode 
            ? "bg-black border-[#39FF14]/50" 
            : "bg-white border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        }`}>
          <h3 className={`flex items-center gap-2 font-bold mb-3 ${privateMode ? "text-[#39FF14]" : "text-gray-900"}`}>
            <Activity className="w-4 h-4" />
            {privateMode ? "> ACTIVITY" : "Activity"}
            <span className="ml-auto flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full animate-pulse ${privateMode ? "bg-[#39FF14]" : "bg-green-500"}`}></span>
              <span className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>LIVE</span>
            </span>
          </h3>
          
          {tokenActivity && tokenActivity.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tokenActivity.slice(0, 5).map((activity) => {
                const isBuy = activity.side === "buy" || activity.activityType === "buy";
                const amount = activity.amount ? parseFloat(activity.amount) : 0;
                const timeAgo = getTimeAgo(new Date(activity.createdAt));
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-2 border ${
                      privateMode ? "border-[#39FF14]/20 hover:border-[#39FF14]/50" : "border-gray-200 hover:border-gray-400 rounded"
                    }`}
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center text-xs border ${
                      isBuy 
                        ? privateMode ? "border-green-500 text-green-400" : "border-green-500 text-green-600 bg-green-50"
                        : privateMode ? "border-red-500 text-red-400" : "border-red-500 text-red-600 bg-red-50"
                    }`}>
                      {isBuy ? <Plus className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm ${privateMode ? "text-white" : "text-gray-900"}`}>
                        {activity.walletAddress?.slice(0, 6)} {isBuy ? "bought" : "sold"}
                      </div>
                      <div className={`text-xs ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>{timeAgo}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isBuy ? "text-green-500" : "text-red-500"}`}>
                        {isBuy ? "+" : "-"}{amount.toFixed(4)} SOL
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className={`text-center py-6 ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`}>
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trades yet</p>
            </div>
          )}
        </div>

        {/* Explore More Tokens */}
        {otherTokens && otherTokens.length > 0 && (
          <div>
            <h3 className={`text-sm mb-3 ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
              {privateMode ? "> EXPLORE_MORE" : "Explore more tokens"}
            </h3>
            <div className="space-y-2">
              {otherTokens.map((t) => (
                <Link key={t.mint} href={`/token/${t.mint}`}>
                  <motion.div 
                    whileHover={{ y: -2, x: -2 }}
                    className={`flex items-center gap-3 p-3 border-2 transition-all ${
                      privateMode 
                        ? "bg-black border-[#39FF14]/30 hover:border-[#39FF14]"
                        : "bg-white border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    }`} 
                    data-testid={`explore-token-${t.mint}`}
                  >
                    <div className={`w-10 h-10 overflow-hidden border ${
                      privateMode ? "bg-black border-[#39FF14]/30" : "bg-gray-100 border-black rounded"
                    }`}>
                      {t.imageUri ? (
                        <img src={t.imageUri} alt={t.name} className={`w-full h-full object-cover ${privateMode ? "opacity-80 sepia brightness-90 saturate-150 hue-rotate-60" : ""}`} />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center font-bold ${
                          privateMode ? "text-[#39FF14]" : "text-red-500"
                        }`}>
                          {t.symbol[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-bold ${privateMode ? "text-[#39FF14]" : "text-gray-900"}`}>{t.name}</div>
                      <div className={`text-xs ${privateMode ? "text-[#39FF14]/50" : "text-gray-500"}`}>${t.symbol}</div>
                    </div>
                    <div className={`text-xs font-mono ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
                      {t.bondingCurveProgress.toFixed(0)}%
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>
                        {formatMarketCap(t.marketCapSol, solPrice?.price || null)}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
