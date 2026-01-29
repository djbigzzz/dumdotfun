import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { useIncoPrivacy, encryptBetForInco } from "@/lib/inco-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Twitter, MessageCircle, Globe, Loader2, Target, Plus, Copy, Check, Eye, Shield, Lock } from "lucide-react";
import { TokenHoldersCard } from "@/components/token-holders-card";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Buffer } from "buffer";
import { Transaction, Connection } from "@solana/web3.js";

const SOLANA_RPC = "https://api.devnet.solana.com";
import defaultAvatar from "@assets/generated_images/derpy_blob_meme_mascot.png";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

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
  if (price < 0.00000001) return `$${price.toExponential(2)}`;
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  return `$${price.toFixed(6)}`;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(2)}`;
  return "$0.00";
}

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const [, setLocation] = useLocation();
  const { connectedWallet, connectWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const { shouldEncryptBets } = useIncoPrivacy();
  const queryClient = useQueryClient();
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeQuote, setTradeQuote] = useState<{ amountOut: string; priceImpact: number } | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);

  // Fetch quote when amount or type changes
  useQuery({
    queryKey: ["trade-quote", mint, tradeAmount, tradeType],
    queryFn: async () => {
      const amount = parseFloat(tradeAmount);
      if (isNaN(amount) || amount <= 0) {
        setTradeQuote(null);
        return null;
      }
      
      setIsQuoting(true);
      try {
        const lamports = Math.floor(amount * 1e9);
        const res = await fetch(`/api/trade/quote?tokenMint=${mint}&amount=${lamports}&isBuy=${tradeType === "buy"}`);
        const data = await res.json();
        if (data.success && data.quote?.quote) {
          const innerQuote = data.quote.quote;
          setTradeQuote({
            amountOut: innerQuote.outputAmount || "0",
            priceImpact: innerQuote.priceImpact || 0,
          });
        } else {
          setTradeQuote(null);
        }
        return data;
      } catch (err) {
        setTradeQuote(null);
        return null;
      } finally {
        setIsQuoting(false);
      }
    },
    enabled: !!mint && !!tradeAmount && parseFloat(tradeAmount) > 0,
    refetchInterval: 5000,
  });
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
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      const data = await res.json();
      if (typeof window !== "undefined") {
        (window as any).lastSolPrice = data.price;
      }
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: tokenBalance } = useQuery<{ balance: number }>({
    queryKey: ["token-balance", connectedWallet, mint],
    queryFn: async () => {
      const res = await fetch(`/api/devnet/token-balance/${connectedWallet}/${mint}`);
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: !!connectedWallet && !!mint && tradeType === "sell",
    refetchInterval: 10000,
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
    mutationFn: async ({ marketId, side, amount, confidential }: { marketId: string; side: "yes" | "no"; amount: number; confidential?: boolean }) => {
      if (!connectedWallet) throw new Error("Wallet not connected");
      
      // Use confidential betting endpoint if privacy mode is on
      if (confidential) {
        const confidentialRes = await fetch(`/api/markets/${marketId}/confidential-bet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: connectedWallet,
            side,
            amount,
          }),
        });
        
        if (!confidentialRes.ok) {
          const errorData = await confidentialRes.json();
          throw new Error(errorData.error || "Failed to place confidential bet");
        }
        
        return confidentialRes.json();
      }
      
      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet not found");
      }

      // Step 1: Prepare bet (get transaction to sign)
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
        const errorData = await prepareRes.json();
        throw new Error(errorData.error || "Failed to prepare bet");
      }
      
      const { transaction: txBase64, betId } = await prepareRes.json();

      // Step 2: Sign transaction with Phantom
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      
      let signedTx;
      try {
        signedTx = await phantom.signTransaction(transaction);
      } catch (signError: any) {
        if (signError.message?.includes("User rejected")) {
          throw new Error("Transaction cancelled");
        }
        throw new Error("Failed to sign: " + signError.message);
      }

      // Step 3: Send signed transaction
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(signature, "confirmed");

      // Step 4: Confirm bet with server
      const confirmRes = await fetch(`/api/markets/${marketId}/confirm-bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betId, signature }),
      });
      
      if (!confirmRes.ok) {
        const errorData = await confirmRes.json();
        throw new Error(errorData.error || "Failed to confirm bet");
      }
      
      return confirmRes.json();
    },
    onSuccess: (_, variables) => {
      toast.success(variables.confidential ? "Private bet placed!" : "Bet placed!");
      setActiveBet(null);
      setBetAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
    },
    onError: (error: Error) => toast.error(error.message),
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

  const formatChartTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    switch (chartInterval) {
      case "1m":
      case "5m":
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      case "1h":
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      default:
        if (diffDays > 1) {
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    }
  };

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
      confidential: privateMode,
    });
  };

  const handleTrade = async () => {
    if (!connectedWallet || !tradeAmount || !token) {
      toast.error("Please connect wallet and enter amount");
      return;
    }
    
    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    const isBuy = tradeType === "buy";
    toast.info(`${isBuy ? "Buying" : "Selling"} ${tradeAmount} SOL worth of ${token.symbol}...`);
    
    try {
      // Convert SOL to lamports for buy, or use token base units for sell
      const lamports = Math.floor(amount * 1e9);
      
      // Build the transaction on the server
      const buildResponse = await fetch("/api/trade/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: connectedWallet,
          tokenMint: token.mint,
          amount: lamports.toString(),
          isBuy,
          slippageBps: 500, // 5% slippage
        }),
      });
      
      const buildResult = await buildResponse.json();
      
      if (!buildResult.success || !buildResult.transaction) {
        toast.error(buildResult.error || "Failed to build transaction");
        return;
      }
      
      // Deserialize the transaction
      const transactionBytes = Uint8Array.from(atob(buildResult.transaction), c => c.charCodeAt(0));
      
      // Get Phantom wallet provider
      const provider = (window as any).solana;
      if (!provider || !provider.isPhantom) {
        toast.error("Please install Phantom wallet");
        return;
      }
      
      // Sign and send the transaction
      toast.info("Please approve the transaction in your wallet...");
      
      const { Connection, Transaction } = await import("@solana/web3.js");
      const transaction = Transaction.from(transactionBytes);
      
      // Sign and send with Phantom
      const { signature } = await provider.signAndSendTransaction(transaction);
      
      toast.success(`Transaction submitted! Signature: ${signature.slice(0, 8)}...`);
      
      // Record the trade in our database
      await fetch("/api/trade/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: connectedWallet,
          tokenMint: token.mint,
          amount: tradeAmount,
          side: isBuy ? "buy" : "sell",
          signature,
        }),
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
      queryClient.invalidateQueries({ queryKey: ["tokenActivity", mint] });
      queryClient.invalidateQueries({ queryKey: ["devnetBalance", connectedWallet] });
      
      setTradeAmount("");
      
    } catch (error: any) {
      console.error("Trade error:", error);
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(error.message || "Trade failed");
      }
    }
  };

  const marketCapUsd = useMemo(() => {
    if (!token || !solPrice) return null;
    return token.marketCapSol * solPrice.price;
  }, [token, solPrice]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className={`w-8 h-8 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className={`font-mono ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>Token not found</p>
          <Link href="/tokens">
            <button className={`flex items-center gap-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-500 hover:text-gray-700"}`}>
              <ArrowLeft className="w-4 h-4" /> Back to tokens
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const cardStyle = privateMode 
    ? "bg-black border-2 border-[#4ADE80]" 
    : "bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const inputStyle = privateMode
    ? "bg-black border-2 border-[#4ADE80]/50 text-[#4ADE80] focus:border-[#4ADE80]"
    : "bg-white border-2 border-black focus:ring-2 focus:ring-red-500";

  return (
    <Layout>
      <div className="space-y-4">
        {/* Back Button */}
        <Link href="/tokens">
          <button className={`flex items-center gap-2 text-sm ${privateMode ? "text-[#4ADE80]" : "text-gray-500 hover:text-gray-700"}`} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" /> Back to tokens
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Token Header */}
            <div className={`${cardStyle} p-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${privateMode ? "border-[#4ADE80]/30 bg-black" : "border-black bg-gray-100"}`}>
                  {token.imageUri ? (
                    <img src={token.imageUri} alt={token.name} className={`w-full h-full object-cover ${privateMode ? "opacity-80 sepia brightness-90 saturate-150 hue-rotate-60" : ""}`} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-black text-xl ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>
                      {token.symbol[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-xl ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>{token.name}</span>
                    <span className={`text-sm font-mono px-2 py-0.5 rounded ${privateMode ? "bg-black text-[#4ADE80]/70 border border-[#4ADE80]/30" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                      ${token.symbol}
                    </span>
                    <button onClick={handleCopyAddress} className={`text-xs flex items-center gap-1 ${privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80]" : "text-gray-400 hover:text-gray-600"}`}>
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {token.mint.slice(0, 6)}...
                    </button>
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                    <span>by {token.creatorAddress.slice(0, 6)}</span>
                    <span>{getTimeAgo(new Date(token.createdAt))} ago</span>
                    <div className="flex items-center gap-2">
                      {token.twitter && <a href={token.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700"><Twitter className="w-3.5 h-3.5" /></a>}
                      {token.telegram && <a href={token.telegram} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700"><MessageCircle className="w-3.5 h-3.5" /></a>}
                      {token.website && <a href={token.website} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700"><Globe className="w-3.5 h-3.5" /></a>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
                    {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                  </div>
                  <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                    {token.bondingCurveProgress.toFixed(1)}% bonded
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className={`${cardStyle} p-4`}>
              <div className="h-56">
                {filteredPriceHistory && filteredPriceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredPriceHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={privateMode ? "#4ADE80" : "#ef4444"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={privateMode ? "#4ADE80" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tickFormatter={formatChartTime} stroke={privateMode ? "#4ADE80" : "#888"} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(v) => formatPrice(v * (solPrice?.price || (window as any).lastSolPrice || 200))} stroke={privateMode ? "#4ADE80" : "#888"} fontSize={10} tickLine={false} axisLine={false} width={60} orientation="right" />
                      <Tooltip contentStyle={{ backgroundColor: privateMode ? '#000' : '#fff', border: privateMode ? '1px solid #4ADE80' : '2px solid #000', borderRadius: '4px', fontSize: '12px' }} labelFormatter={(t) => new Date(t).toLocaleString()} formatter={(value: number) => [formatPrice(value * (solPrice?.price || (window as any).lastSolPrice || 200)), 'Price']} />
                      <Area type="monotone" dataKey="price" stroke={privateMode ? "#4ADE80" : "#ef4444"} strokeWidth={2} fill="url(#chartGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-full flex items-center justify-center text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                    No price data yet
                  </div>
                )}
              </div>
              
              {/* Chart Intervals */}
              <div className="flex items-center gap-2 mt-3">
                {(["1m", "5m", "1h", "all"] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setChartInterval(interval)}
                    className={`px-3 py-1 text-xs font-bold border-2 transition-all ${
                      chartInterval === interval
                        ? privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-black text-white border-black"
                        : privateMode ? "bg-black text-[#4ADE80]/70 border-[#4ADE80]/30 hover:border-[#4ADE80]" : "bg-white text-gray-500 border-gray-300 hover:border-black"
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
              {[
                { label: "Price", value: formatPrice(token.priceInSol * (solPrice?.price || (window as any).lastSolPrice || 200)) },
                { label: "Market Cap", value: formatMarketCap(token.marketCapSol, solPrice?.price || null) },
                { label: "Holders", value: "-" },
                { label: "Txns", value: tokenActivity?.length || 0 },
              ].map(({ label, value }) => (
                <div key={label} className={`${cardStyle} p-3 text-center`}>
                  <div className={`text-xs ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>{label}</div>
                  <div className={`font-mono text-sm font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Trades */}
            <div className={`${cardStyle} p-4`}>
              <div className={`font-bold mb-3 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>Recent Trades</div>
              {tokenActivity && tokenActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-xs border-b-2 ${privateMode ? "text-[#4ADE80]/70 border-[#4ADE80]/30" : "text-gray-500 border-gray-200"}`}>
                        <th className="text-left py-2">Account</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-right py-2">Amount</th>
                        <th className="text-right py-2">Time</th>
                        <th className="text-right py-2">Txn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenActivity.slice(0, 8).map((activity) => {
                        const isBuy = activity.side === "buy" || activity.activityType === "buy";
                        const amount = activity.amount ? parseFloat(activity.amount) : 0;
                        
                        // Parse metadata for real blockchain data
                        let blockTime: number | null = null;
                        let signature: string | null = null;
                        try {
                          if (activity.metadata) {
                            const meta = JSON.parse(activity.metadata);
                            if (meta.blockTime) blockTime = meta.blockTime;
                            if (meta.signature) signature = meta.signature;
                          }
                        } catch {}
                        
                        // Use blockchain timestamp if available, otherwise use createdAt
                        const displayTime = blockTime 
                          ? getTimeAgo(new Date(blockTime * 1000))
                          : getTimeAgo(new Date(activity.createdAt));
                        
                        return (
                          <tr key={activity.id} className={`border-b ${privateMode ? "border-[#4ADE80]/20" : "border-gray-100"}`}>
                            <td className={`py-2 ${privateMode ? "text-white" : "text-gray-600"}`}>
                              <Link href={`/user/${activity.walletAddress}`}>
                                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                                  <img src={defaultAvatar} alt="" className="w-6 h-6 rounded-full border border-gray-300" />
                                  <span className="hover:underline">{activity.walletAddress?.slice(0, 6)}...</span>
                                </div>
                              </Link>
                            </td>
                            <td className={`py-2 font-bold ${isBuy ? "text-green-500" : "text-red-500"}`}>{isBuy ? "Buy" : "Sell"}</td>
                            <td className={`py-2 text-right ${privateMode ? "text-white" : "text-gray-900"}`}>
                              {formatMarketCap(amount, solPrice?.price || null)}
                            </td>
                            <td className={`py-2 text-right ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>{displayTime}</td>
                            <td className="py-2 text-right">
                              {signature ? (
                                <a 
                                  href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-xs ${privateMode ? "text-[#4ADE80] hover:underline" : "text-blue-500 hover:underline"}`}
                                >
                                  {signature.slice(0, 6)}...
                                </a>
                              ) : (
                                <span className={`text-xs ${privateMode ? "text-[#4ADE80]/30" : "text-gray-300"}`}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`text-center py-6 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>No trades yet</div>
              )}
            </div>

            {/* Predictions */}
            {token.predictions && token.predictions.length > 0 && (
              <div className={`${cardStyle} p-4 ${privateMode ? "border-yellow-500" : "border-yellow-500"}`} style={{ boxShadow: privateMode ? "none" : "4px 4px 0px 0px rgba(234,179,8,1)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-2 font-bold ${privateMode ? "text-yellow-400" : "text-yellow-700"}`}>
                    <Target className="w-4 h-4" /> Prediction Markets
                  </div>
                  <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                    <button className={`text-xs px-2 py-1 font-bold border ${privateMode ? "bg-black border-yellow-500 text-yellow-400" : "bg-yellow-500 border-black text-black"}`} data-testid="button-create-market">
                      <Plus className="w-3 h-3 inline" /> Create
                    </button>
                  </Link>
                </div>
                {token.predictions.slice(0, 2).map((prediction) => {
                  const isBettingActive = activeBet?.predictionId === prediction.id;
                  return (
                    <div key={prediction.id} className={`p-3 mb-2 border ${privateMode ? "bg-black border-yellow-500/30" : "bg-yellow-50 border-gray-200 rounded"}`} data-testid={`prediction-${prediction.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${privateMode ? "text-white" : "text-gray-900"}`}>{prediction.question}</span>
                        <a 
                          href={`/market/${prediction.id}`}
                          className={`text-xs px-2 py-1 rounded font-bold ${privateMode ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                          data-testid={`link-market-${prediction.id}`}
                        >
                          VIEW MARKET
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={(e) => handleBetClick(prediction.id, "yes", e)} className={`py-2 font-bold border-2 transition-all ${isBettingActive && activeBet?.side === "yes" ? "bg-green-500 text-white border-green-500" : privateMode ? "bg-black border-green-500/50 text-green-400" : "bg-green-100 border-green-500 text-green-700"}`} data-testid={`button-bet-yes-${prediction.id}`}>
                          <span className="block font-bold">{prediction.yesOdds}%</span>
                          <span className="text-xs">YES</span>
                        </button>
                        <button onClick={(e) => handleBetClick(prediction.id, "no", e)} className={`py-2 font-bold border-2 transition-all ${isBettingActive && activeBet?.side === "no" ? "bg-red-500 text-white border-red-500" : privateMode ? "bg-black border-red-500/50 text-red-400" : "bg-red-100 border-red-500 text-red-700"}`} data-testid={`button-bet-no-${prediction.id}`}>
                          <span className="block font-bold">{prediction.noOdds}%</span>
                          <span className="text-xs">NO</span>
                        </button>
                      </div>
                      {isBettingActive && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 flex gap-2">
                          <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="SOL amount" className={`flex-1 px-3 py-2 text-sm ${inputStyle}`} onClick={(e) => e.stopPropagation()} data-testid={`input-bet-amount-${prediction.id}`} />
                          <button onClick={handlePlaceBet} disabled={placeBetMutation.isPending} className={`px-4 py-2 font-bold text-sm border-2 ${privateMode ? "bg-[#4ADE80] border-[#4ADE80]" : activeBet?.side === "yes" ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600"} text-white flex items-center gap-1`} data-testid={`button-confirm-bet-${prediction.id}`}>
                            {placeBetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : privateMode ? <><Lock className="w-3 h-3" /> PRIVATE</> : "BET"}
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
            <div className={`${cardStyle} p-4 sticky top-4`}>
              {/* Buy/Sell Toggle */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setTradeType("buy")} className={`flex-1 py-2 font-bold border-2 transition-all ${tradeType === "buy" ? privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-green-500 text-white border-green-500" : privateMode ? "bg-black text-[#4ADE80]/50 border-[#4ADE80]/30" : "bg-gray-100 text-gray-500 border-gray-300"}`}>
                  Buy
                </button>
                <button onClick={() => setTradeType("sell")} className={`flex-1 py-2 font-bold border-2 transition-all ${tradeType === "sell" ? "bg-red-500 text-white border-red-500" : privateMode ? "bg-black text-[#4ADE80]/50 border-[#4ADE80]/30" : "bg-gray-100 text-gray-500 border-gray-300"}`}>
                  Sell
                </button>
              </div>

              {/* Privacy Features Info */}
              {tradeType === "buy" && privateMode && (
                <div className="mb-4 p-3 rounded-lg bg-zinc-900/50 border border-[#4ADE80]/20">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#4ADE80]/50" />
                    <span className="text-sm font-bold text-[#4ADE80]/70">
                      Privacy Mode Active
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#4ADE80]/50">
                    Stealth addresses for token trading coming soon. Use prediction markets for confidential betting.
                  </p>
                </div>
              )}

              {/* Token Balance Display for Sell */}
              {tradeType === "sell" && connectedWallet && (
                <div className={`flex items-center justify-between text-xs mb-2 px-1 ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                  <span>Your Balance:</span>
                  <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                    {tokenBalance?.balance ? tokenBalance.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} {token.symbol}
                  </span>
                </div>
              )}

              {/* Amount Input */}
              <div className="relative mb-3">
                <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} placeholder="0.00" className={`w-full px-4 py-3 text-lg font-mono ${inputStyle}`} />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>{tradeType === "buy" ? "SOL" : token.symbol}</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {tradeType === "buy" ? (
                  ["0.1", "0.5", "1", "Max"].map((amt) => (
                    <button key={amt} onClick={() => amt === "Max" ? setTradeAmount("1") : setTradeAmount(amt)} className={`text-xs py-2 font-bold border transition-all ${privateMode ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]/70 hover:border-[#4ADE80]" : "bg-gray-100 border-gray-300 text-gray-600 hover:border-black"}`}>
                      {amt === "Max" ? amt : `${amt}`}
                    </button>
                  ))
                ) : (
                  ["25%", "50%", "75%", "Max"].map((pct) => (
                    <button key={pct} onClick={() => {
                      const balance = tokenBalance?.balance || 0;
                      if (pct === "Max") {
                        setTradeAmount(balance.toString());
                      } else {
                        const percent = parseInt(pct) / 100;
                        setTradeAmount((balance * percent).toFixed(2));
                      }
                    }} className={`text-xs py-2 font-bold border transition-all ${privateMode ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]/70 hover:border-[#4ADE80]" : "bg-gray-100 border-gray-300 text-gray-600 hover:border-black"}`}>
                      {pct}
                    </button>
                  ))
                )}
              </div>

              {/* Quote Display */}
              <AnimatePresence>
                {tradeQuote && tradeAmount && parseFloat(tradeAmount) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 mb-4 rounded border-2 font-mono text-xs space-y-1 ${privateMode ? "border-[#4ADE80]/30 bg-[#4ADE80]/5" : "border-black/5 bg-gray-50"}`}
                  >
                    <div className="flex justify-between">
                      <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>You receive:</span>
                      <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-black"}`}>
                        {tradeType === "buy" 
                          ? `${(parseFloat(tradeQuote.amountOut) / 1e6).toLocaleString()} ${token.symbol}`
                          : `${(parseFloat(tradeQuote.amountOut) / 1e9).toFixed(4)} SOL`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>Price Impact:</span>
                      <span className={(tradeQuote.priceImpact || 0) > 5 ? "text-red-500" : (privateMode ? "text-[#4ADE80]" : "text-green-600")}>
                        {(tradeQuote.priceImpact || 0).toFixed(2)}%
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              {!connectedWallet ? (
                <motion.button whileHover={{ y: -2, x: -2 }} whileTap={{ y: 0, x: 0 }} onClick={() => connectWallet()} className={`w-full font-bold py-3 border-2 transition-all ${privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"}`} data-testid="button-connect-wallet">
                  Connect Wallet
                </motion.button>
              ) : (
                <motion.button whileHover={{ y: -2, x: -2 }} whileTap={{ y: 0, x: 0 }} onClick={handleTrade} disabled={!tradeAmount || Number(tradeAmount) <= 0 || isQuoting} className={`w-full font-bold py-3 border-2 transition-all disabled:opacity-50 ${tradeType === "buy" ? privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-green-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" : "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`} data-testid="button-trade">
                  {isQuoting ? "Quoting..." : `${tradeType === "buy" ? "Buy" : "Sell"} ${token.symbol}`}
                </motion.button>
              )}
            </div>

            {/* Bonding Curve Progress */}
            <div className={`${cardStyle} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>Bonding Curve</span>
                <span className={`font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>{token?.bondingCurveProgress ? token.bondingCurveProgress.toFixed(1) : "0.0"}%</span>
              </div>
              <div className={`h-3 rounded-full overflow-hidden border ${privateMode ? "bg-black border-[#4ADE80]/30" : "bg-gray-200 border-gray-300"}`}>
                <div className={`h-full transition-all ${privateMode ? "bg-[#4ADE80]" : (token?.bondingCurveProgress || 0) > 80 ? "bg-green-500" : (token?.bondingCurveProgress || 0) > 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(token?.bondingCurveProgress || 0, 100)}%` }} />
              </div>
              <div className={`flex justify-between text-xs mt-2 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                <span>{token?.virtualSolReserves ? (token.virtualSolReserves / 1e9).toFixed(2) : "0.00"} SOL</span>
                <span>85 SOL to graduate</span>
              </div>
            </div>

            {/* Description */}
            {token.description && (
              <div className={`${cardStyle} p-4`}>
                <div className={`text-sm font-bold mb-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>About</div>
                <p className={`text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-600"}`}>{token.description}</p>
              </div>
            )}

            {/* Links */}
            <div className={`${cardStyle} p-4`}>
              <a href={`https://solscan.io/token/${token.mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between text-sm py-2 border-b ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80] border-[#4ADE80]/20" : "text-gray-500 hover:text-gray-700 border-gray-200"}`}>
                <span>View on Solscan</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a href={`https://birdeye.so/token/${token.mint}?chain=solana`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between text-sm py-2 ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80]" : "text-gray-500 hover:text-gray-700"}`}>
                <span>View on Birdeye</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Token Holders */}
            <TokenHoldersCard tokenMint={token.mint} compact />
          </div>
        </div>
      </div>
    </Layout>
  );
}
