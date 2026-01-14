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
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-zinc-950">
          <div className="animate-pulse text-gray-500 font-mono">Loading token...</div>
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-4 bg-zinc-950">
          <p className="text-red-500 font-mono">Token not found</p>
          <Link href="/tokens">
            <button className="text-gray-500 hover:text-gray-300 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to tokens
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 lg:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <Link href="/tokens">
          <button className="text-gray-400 hover:text-white flex items-center gap-2 text-sm mb-4" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
            {token.imageUri ? (
              <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-green-400 font-black text-lg bg-zinc-800">
                {token.symbol[0]}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm">{token.name}</span>
              <span className="text-white font-medium">${token.symbol}</span>
              {token.twitter && (
                <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {token.telegram && (
                <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {token.website && (
                <a href={token.website} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xl font-bold text-white">
              {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
              <span className="text-xs text-gray-500 ml-1">MC</span>
            </div>
            <div className="text-xs text-green-400">
              ● {token.bondingCurveProgress.toFixed(1)}% curve
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              {formatMarketCap(token.marketCapSol, solPrice?.price || null)} ATH ≋
            </span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
              style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 mb-4">
          <div className="h-48 relative">
            {filteredPriceHistory && filteredPriceHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredPriceHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="priceGradientPump" x1="0" y1="0" x2="0" y2="1">
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
                    tickFormatter={(v) => `$${(v * (solPrice?.price || 200)).toFixed(0)}`}
                    stroke="#444"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    orientation="right"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                    formatter={(value: number) => [`${value.toFixed(10)} SOL`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    fill="url(#priceGradientPump)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                <div className="w-full h-24 flex items-end justify-around px-4">
                  {[20, 35, 25, 45, 30, 50, 40, 55, 45, 60].map((h, i) => (
                    <div key={i} className="w-2 bg-green-500/30 rounded-t" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-gray-500">● {formatPrice(token.priceInSol)}</span>
            <span className="text-gray-500">● {token.marketCapSol.toFixed(3)} SOL</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {["Tick", "1m", "5m", "All"].map((interval) => (
              <button
                key={interval}
                onClick={() => setChartInterval(interval.toLowerCase() as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  chartInterval === interval.toLowerCase()
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                }`}
                data-testid={`button-interval-${interval.toLowerCase()}`}
              >
                {interval}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button className="text-gray-500 hover:text-white">
                <TrendingUp className="w-4 h-4" />
              </button>
              <button className="text-gray-500 hover:text-white">
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[0.05, 0.1, 0.2].map((amount) => (
            <button
              key={amount}
              onClick={() => handleQuickBuy(amount)}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all"
              data-testid={`button-quick-buy-${amount}`}
            >
              {amount} ◎
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4 text-sm">
          <div className="flex-1 flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2">
            <span className="text-white font-medium">{tradeQuote ? `$${(Number(tradeAmount) * (solPrice?.price || 200)).toFixed(2)}` : "$0.00"}</span>
            <span className="text-gray-500">≈ {tradeAmount || "0"} SOL</span>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{ height: showAbout ? "auto" : "auto" }}
          className="bg-zinc-900/50 rounded-xl p-4 mb-4"
        >
          <button 
            onClick={() => setShowAbout(!showAbout)}
            className="flex items-center gap-2 w-full text-left"
            data-testid="button-toggle-about"
          >
            <span className="text-white font-medium">ⓘ About</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAbout ? "rotate-180" : ""}`} />
          </button>
          
          <AnimatePresence>
            {showAbout && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="text-lg font-mono text-white">{formatPrice(token.priceInSol)}</div>
                    <div className="text-xs text-gray-500">Price</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-lg p-3">
                    <div className="text-lg font-mono text-white">
                      {marketCapUsd ? `$${(marketCapUsd / 1000).toFixed(1)}K` : `${token.marketCapSol.toFixed(1)} SOL`}
                    </div>
                    <div className="text-xs text-gray-500">Market Cap</div>
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">●</span>
                    <span className="text-lg font-mono text-white">{token.bondingCurveProgress.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-500">Bonding Curve</div>
                </div>
                {token.description && (
                  <p className="text-gray-400 text-sm">{token.description}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="bg-zinc-900/50 rounded-xl p-4 mb-4">
          <h3 className="flex items-center gap-2 text-white font-medium mb-3">
            <Users className="w-4 h-4" />
            Token Info
          </h3>
          <div className="grid grid-cols-2 gap-2 text-center mb-4">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-sm font-mono text-white truncate">{token.creatorAddress.slice(0, 6)}...{token.creatorAddress.slice(-4)}</div>
              <div className="text-[10px] text-gray-500">👤 Creator</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-sm font-mono text-white">{new Date(token.createdAt).toLocaleDateString()}</div>
              <div className="text-[10px] text-gray-500">📅 Created</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-sm font-mono text-white">{token.isGraduated ? "Graduated" : "Bonding"}</div>
              <div className="text-[10px] text-gray-500">📊 Status</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <a 
                href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
              <div className="text-[10px] text-gray-500">🔗 Solscan</div>
            </div>
          </div>
        </div>

        {token.predictions && token.predictions.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-yellow-400 font-medium">
                <Target className="w-4 h-4" />
                Predictions
              </h3>
              <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                <button className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-2 py-1 rounded" data-testid="button-create-market">
                  <Plus className="w-3 h-3 inline" /> Create
                </button>
              </Link>
            </div>
            {token.predictions.slice(0, 2).map((prediction) => {
              const isBettingActive = activeBet?.predictionId === prediction.id;
              return (
                <div key={prediction.id} className="bg-zinc-900/50 rounded-lg p-3 mb-2" data-testid={`prediction-${prediction.id}`}>
                  <Link href={`/market/${prediction.id}`}>
                    <p className="text-white text-sm mb-2 hover:text-yellow-400">{prediction.question}</p>
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => handleBetClick(prediction.id, "yes", e)}
                      className={`py-2 rounded-lg text-center transition-all ${
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
                      className={`py-2 rounded-lg text-center transition-all ${
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
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`input-bet-amount-${prediction.id}`}
                      />
                      <button
                        onClick={handlePlaceBet}
                        disabled={placeBetMutation.isPending}
                        className={`px-4 py-2 rounded-lg font-bold text-sm ${
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

        <div className="bg-zinc-900/50 rounded-xl p-4 mb-4">
          <h3 className="flex items-center gap-2 text-white font-medium mb-3">
            <Activity className="w-4 h-4" />
            Activity
            <span className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-500">LIVE</span>
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
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/30"
                    data-testid={`activity-${activity.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${isBuy ? "bg-green-500/20" : "bg-red-500/20"}`}>
                      {isBuy ? <Plus className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm">
                        {activity.walletAddress?.slice(0, 6)} {isBuy ? "acquired" : "sold"}
                      </div>
                      <div className="text-gray-500 text-xs">{timeAgo} ↗</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm ${isBuy ? "text-green-400" : "text-red-400"}`}>
                        {isBuy ? "+" : "-"}{amount.toFixed(4)} SOL
                      </div>
                      <div className="text-gray-500 text-xs">{isBuy ? "bought" : "sold"}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No trades yet</p>
            </div>
          )}
          
          {tokenActivity && tokenActivity.length > 5 && (
            <button className="w-full text-center text-gray-500 text-sm py-2 hover:text-white" data-testid="button-see-all-activity">
              ⬇ See all
            </button>
          )}
        </div>

        {otherTokens && otherTokens.length > 0 && (
          <div className="mb-4">
            <h3 className="text-gray-400 text-sm mb-3">Explore more coins</h3>
            <div className="space-y-2">
              {otherTokens.map((t) => (
                <Link key={t.mint} href={`/token/${t.mint}`}>
                  <div className="flex items-center gap-3 bg-zinc-900/50 rounded-xl p-3 hover:bg-zinc-800/50 transition-all" data-testid={`explore-token-${t.mint}`}>
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden">
                      {t.imageUri ? (
                        <img src={t.imageUri} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-green-400 font-bold">
                          {t.symbol[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{t.name}</div>
                      <div className="text-gray-500 text-xs">{t.symbol}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.bondingCurveProgress.toFixed(0)}% curve
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatMarketCap(t.marketCapSol, solPrice?.price || null)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 lg:hidden">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 flex-1">
            <button 
              onClick={() => setTradeType("buy")}
              className={`text-xs font-medium px-2 py-1 rounded ${tradeType === "buy" ? "bg-green-500 text-white" : "text-gray-400"}`}
            >
              Support
            </button>
            <span className="text-gray-600">—</span>
            <button 
              onClick={() => setTradeType("sell")}
              className={`text-xs font-medium px-2 py-1 rounded ${tradeType === "sell" ? "bg-red-500 text-white" : "text-gray-400"}`}
            >
              Auto
            </button>
          </div>
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
            <span className="text-white">◎</span>
            <span className="text-gray-400">SOL</span>
            <span className="text-gray-600">→</span>
            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
              {token.symbol[0]}
            </div>
            <span className="text-white">{token.symbol}</span>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto mt-3">
          <div className="text-center text-2xl font-bold text-white mb-2">
            {tradeAmount || "0"} SOL
          </div>
          <div className="text-center text-gray-500 text-sm mb-3">
            ≈ {tradeQuote ? tradeQuote.outputAmount.toLocaleString() : "0.00"} {token.symbol}
          </div>
          
          <div className="flex gap-2 mb-3">
            {["0.01", "0.1", "0.5", "Max"].map((amt) => (
              <button
                key={amt}
                onClick={() => amt === "Max" ? setTradeAmount("1") : setTradeAmount(amt)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-sm py-2 rounded-lg"
              >
                {amt === "Max" ? amt : `${amt} SOL`}
              </button>
            ))}
          </div>
          
          <div className="text-center text-gray-500 text-xs mb-3">
            Balance: {connectedWallet ? "0.015486035 SOL" : "Connect wallet"}
          </div>
          
          {!connectedWallet ? (
            <button
              onClick={() => connectWallet()}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all"
              data-testid="button-connect-wallet-mobile"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={handleTrade}
              disabled={!tradeAmount || Number(tradeAmount) <= 0 || isTrading}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50"
              data-testid="button-submit-trade-mobile"
            >
              {isTrading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                `⇌ ${token.symbol}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
