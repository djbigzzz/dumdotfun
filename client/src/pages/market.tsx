import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Target, Clock, Users, ArrowLeft, Loader2, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Lock, Shield, Eye, EyeOff, Info, BookOpen, Zap, Scale, Timer } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { Transaction, Connection } from "@solana/web3.js";
import { useEffect } from "react";

const SOLANA_RPC = "https://api.devnet.solana.com";

interface Market {
  id: string;
  question: string;
  description: string | null;
  imageUri: string | null;
  creatorAddress: string;
  marketType: string;
  tokenMint: string | null;
  resolutionDate: string;
  status: string;
  outcome: string | null;
  yesPool: number;
  noPool: number;
  totalVolume: number;
  yesOdds: number;
  noOdds: number;
  totalPositions: number;
  createdAt: string;
  survivalCriteria?: string;
  resolutionType?: string;
  autoResolve?: boolean;
}

function getCriteriaLabel(criteria: string): string {
  switch (criteria) {
    case "dev_sells": return "Dev Rug Check";
    case "dev_holds": return "Dev Still Holds";
    case "has_liquidity": return "Token Has Liquidity";
    case "recent_activity": return "Recent Trading Activity";
    case "graduated": return "Token Graduated to DEX";
    case "high_survival": return "High Survival Score (75+)";
    case "token_exists": return "Token Health Check";
    default: return "Token Health Check";
  }
}

function getCriteriaDescription(criteria: string): string {
  switch (criteria) {
    case "dev_sells": return "YES wins if the token creator sold 80%+ of the supply (rugged). NO wins if the dev still holds a significant portion.";
    case "dev_holds": return "YES wins if the creator still holds 20%+ of the supply and the token has liquidity. NO wins if the dev dumped their tokens.";
    case "has_liquidity": return "YES wins if the token has active liquidity with multiple holders. NO wins if liquidity dried up.";
    case "recent_activity": return "YES wins if the token had on-chain transactions within the last 7 days. NO wins if there was no activity.";
    case "graduated": return "YES wins if the token has 10+ holders with active liquidity (graduated to DEX). NO wins if it didn't graduate.";
    case "high_survival": return "YES wins if the token scores 75/100+ on the survival score (checks liquidity, activity, dev holdings, and graduation).";
    case "token_exists": return "YES wins if the token has liquidity and the dev still holds their tokens. NO wins if the token is dead or the dev dumped.";
    default: return "YES wins if the token has liquidity and the dev still holds their tokens. NO wins if the token is dead or the dev dumped.";
  }
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0, total: 0,
  });

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        total: diff,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { connectedWallet, connectWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const connected = !!connectedWallet;
  const publicKey = connectedWallet;
  const queryClient = useQueryClient();
  const [betAmount, setBetAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useConfidentialBet, setUseConfidentialBet] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  const [success, setSuccess] = useState<boolean>(false);

  const { data: market, isLoading, error: fetchError } = useQuery<Market>({
    queryKey: ["market", id],
    queryFn: async () => {
      const res = await fetch(`/api/markets/${id}`);
      if (!res.ok) throw new Error("Market not found");
      return res.json();
    },
  });

  const countdown = useCountdown(market?.resolutionDate || new Date().toISOString());

  const placeBetMutation = useMutation({
    mutationFn: async ({ side, amount, confidential }: { side: "yes" | "no"; amount: number; confidential?: boolean }) => {
      const phantom = (window as any).phantom?.solana;
      if (!phantom) {
        throw new Error("Phantom wallet not found");
      }

      // Use confidential betting endpoint if privacy mode is on
      if (confidential) {
        const confidentialRes = await fetch(`/api/markets/${id}/confidential-bet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: publicKey,
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

      // Step 1: Prepare bet (get transaction to sign)
      const prepareRes = await fetch(`/api/markets/${id}/prepare-bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey,
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
          throw new Error("Transaction cancelled by user");
        }
        throw new Error("Failed to sign transaction: " + signError.message);
      }

      // Step 3: Send signed transaction
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(signature, "confirmed");

      // Step 4: Confirm bet with server
      const confirmRes = await fetch(`/api/markets/${id}/confirm-bet`, {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market", id] });
      setBetAmount("");
      setSelectedSide(null);
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handlePlaceBet = async () => {
    if (!connected) {
      await connectWallet();
      return;
    }

    if (!selectedSide) {
      setError("Select YES or NO");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }

    placeBetMutation.mutate({ side: selectedSide, amount, confidential: useConfidentialBet });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (fetchError || !market) {
    return (
      <Layout>
        <div className="text-center py-20 space-y-4">
          <Target className="w-16 h-16 text-gray-600 mx-auto" />
          <p className="text-gray-400">Market not found</p>
          <Link href="/">
            <button className="text-yellow-400 hover:text-yellow-300 underline">
              Back to home
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isResolved = market.status === "resolved";
  const isExpired = countdown.total <= 0 && !isResolved;
  const canBet = !isResolved && !isExpired;
  const criteria = (market as any).survivalCriteria || "token_exists";
  const isAutoResolve = (market as any).autoResolve !== false;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to markets
          </button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-yellow-600/30 rounded-xl overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center flex-shrink-0">
                <Target className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    market.marketType === "token" 
                      ? "bg-red-600/20 text-red-400" 
                      : "bg-blue-600/20 text-blue-400"
                  }`}>
                    {market.marketType === "token" ? "TOKEN" : "GENERAL"}
                  </span>
                  {isResolved && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-600/20 text-gray-400">
                      RESOLVED: {market.outcome?.toUpperCase()}
                    </span>
                  )}
                  {isExpired && !isResolved && (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-600/20 text-yellow-400">
                      PENDING RESOLUTION
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black text-white mb-2">{market.question}</h1>
                {market.description && (
                  <p className="text-gray-400 text-sm">{market.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 p-6 border-b border-zinc-800">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Users className="w-4 h-4" />
                Total Volume
              </div>
              <p className="text-2xl font-black text-white">{market.totalVolume.toFixed(2)} SOL</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Target className="w-4 h-4" />
                Positions
              </div>
              <p className="text-2xl font-black text-white">{market.totalPositions}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Time Left
              </div>
              {isResolved ? (
                <p className="text-2xl font-black text-white">Resolved</p>
              ) : isExpired ? (
                <p className="text-2xl font-black text-yellow-400">Resolving...</p>
              ) : (
                <div className="flex gap-2" data-testid="countdown-timer">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{countdown.days}</p>
                    <p className="text-[10px] text-gray-500 uppercase">days</p>
                  </div>
                  <span className="text-2xl font-black text-gray-600">:</span>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{String(countdown.hours).padStart(2, '0')}</p>
                    <p className="text-[10px] text-gray-500 uppercase">hrs</p>
                  </div>
                  <span className="text-2xl font-black text-gray-600">:</span>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{String(countdown.minutes).padStart(2, '0')}</p>
                    <p className="text-[10px] text-gray-500 uppercase">min</p>
                  </div>
                  <span className="text-2xl font-black text-gray-600">:</span>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">{String(countdown.seconds).padStart(2, '0')}</p>
                    <p className="text-[10px] text-gray-500 uppercase">sec</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Market Rules & Settlement */}
          <div className="p-6 border-b border-zinc-800" data-testid="section-market-rules">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">Market Rules & Settlement</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">Resolution Criteria</span>
                  </div>
                  <p className="text-sm text-yellow-400 font-bold">{getCriteriaLabel(criteria)}</p>
                  <p className="text-xs text-gray-400 mt-1">{getCriteriaDescription(criteria)}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">Resolution Date</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {new Date(market.resolutionDate).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-bold text-white">Resolution Method</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {isAutoResolve ? "Automatic — resolved by on-chain verification" : "Manual — resolved by market creator"}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                <div>
                  <span className="text-sm font-bold text-white block mb-2">How Settlement Works</span>
                  <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                    <li>When the countdown reaches zero, the market closes for new bets</li>
                    <li>The system checks the token on-chain: dev holdings, liquidity, holder count, and activity</li>
                    <li>The outcome is determined based on the resolution criteria above</li>
                    <li>Winnings are calculated proportionally from the total pool</li>
                  </ol>
                </div>
                
                <div className="border-t border-zinc-700 pt-3">
                  <span className="text-sm font-bold text-white block mb-1">Payout Formula</span>
                  <p className="text-xs text-gray-400">
                    Your payout = (your bet / winning pool) x total pool
                  </p>
                  <div className="mt-2 bg-zinc-900 rounded p-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">YES Pool</span>
                      <span className="text-green-400 font-bold">{market.yesPool.toFixed(2)} SOL</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-500">NO Pool</span>
                      <span className="text-red-400 font-bold">{market.noPool.toFixed(2)} SOL</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1 border-t border-zinc-700 pt-1">
                      <span className="text-gray-500">Total Pool</span>
                      <span className="text-yellow-400 font-bold">{market.totalVolume.toFixed(2)} SOL</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">Current Odds</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => canBet && setSelectedSide("yes")}
                disabled={!canBet}
                className={`p-4 md:p-6 rounded-xl border-2 transition-all ${
                  selectedSide === "yes"
                    ? "bg-green-600/30 border-green-500"
                    : canBet
                    ? "bg-green-600/10 border-green-600/40 hover:bg-green-600/20"
                    : "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
                }`}
                data-testid="button-bet-yes"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-bold text-lg">YES</span>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-2xl md:text-4xl font-black text-green-400">{market.yesOdds}%</p>
                <p className="text-sm text-gray-500 mt-2">{market.yesPool.toFixed(2)} SOL in pool</p>
              </button>
              <button
                onClick={() => canBet && setSelectedSide("no")}
                disabled={!canBet}
                className={`p-4 md:p-6 rounded-xl border-2 transition-all ${
                  selectedSide === "no"
                    ? "bg-red-600/30 border-red-500"
                    : canBet
                    ? "bg-red-600/10 border-red-600/40 hover:bg-red-600/20"
                    : "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
                }`}
                data-testid="button-bet-no"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-400 font-bold text-lg">NO</span>
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-2xl md:text-4xl font-black text-red-400">{market.noOdds}%</p>
                <p className="text-sm text-gray-500 mt-2">{market.noPool.toFixed(2)} SOL in pool</p>
              </button>
            </div>

            {canBet && (
              <div className={`rounded-xl p-6 transition-all ${
                useConfidentialBet 
                  ? "bg-black/80 border-2 border-[#4ADE80]/50 shadow-[0_0_20px_rgba(57,255,20,0.15)]" 
                  : "bg-zinc-800/50"
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${useConfidentialBet ? "text-[#4ADE80] font-mono" : "text-white"}`}>
                    {useConfidentialBet ? "🔒 Confidential Bet" : "Place Your Bet"}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                      className={`p-1.5 rounded transition-colors ${
                        useConfidentialBet ? "text-[#4ADE80]/60 hover:text-[#4ADE80]" : "text-gray-500 hover:text-gray-300"
                      }`}
                      data-testid="button-privacy-info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setUseConfidentialBet(!useConfidentialBet)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        useConfidentialBet
                          ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/50"
                          : "bg-zinc-700 text-gray-400 hover:bg-zinc-600 border border-transparent"
                      }`}
                      data-testid="button-toggle-confidential"
                    >
                      {useConfidentialBet ? <Lock className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {useConfidentialBet ? "Private" : "Public"}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showPrivacyInfo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mb-4 p-4 rounded-lg text-sm ${
                        useConfidentialBet 
                          ? "bg-[#4ADE80]/10 border border-[#4ADE80]/30" 
                          : "bg-zinc-700/50 border border-zinc-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${useConfidentialBet ? "text-[#4ADE80]" : "text-blue-400"}`} />
                        <div>
                          <p className={`font-bold mb-1 ${useConfidentialBet ? "text-[#4ADE80]" : "text-white"}`}>
                            {useConfidentialBet ? "Inco Lightning Encryption" : "Privacy Options"}
                          </p>
                          <p className={useConfidentialBet ? "text-[#4ADE80]/70" : "text-gray-400"}>
                            {useConfidentialBet 
                              ? "Your bet amount is encrypted using Inco Lightning SDK. Only you can reveal the amount later. Other users will see '🔒 Hidden' instead of your bet size."
                              : "Enable confidential betting to hide your bet amount from other users. Uses Inco Lightning SDK for zero-knowledge encryption."
                            }
                          </p>
                          {useConfidentialBet && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-[#4ADE80]/50 font-mono">
                              <span>Program: 5sjE...Swaj</span>
                              <span>•</span>
                              <span>Bounty: $2K</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-4 p-3 border rounded-lg flex items-center gap-2 ${
                      useConfidentialBet 
                        ? "bg-[#4ADE80]/20 border-[#4ADE80]/50 text-[#4ADE80]" 
                        : "bg-green-600/20 border-green-600/50 text-green-400"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-sm font-bold">
                      {useConfidentialBet ? "Confidential bet placed successfully!" : "Bet placed successfully!"}
                    </p>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </motion.div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-400 mb-2">Amount (SOL)</label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.1"
                      step="0.01"
                      min="0.01"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                      data-testid="input-bet-amount"
                    />
                  </div>
                  <div className="flex items-end">
                    {!connected ? (
                      <motion.button
                        onClick={() => connectWallet()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                        data-testid="button-connect"
                      >
                        Connect Wallet
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={handlePlaceBet}
                        disabled={placeBetMutation.isPending || !selectedSide}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                          selectedSide === "yes"
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                            : selectedSide === "no"
                            ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
                            : "bg-zinc-700 text-gray-400"
                        }`}
                        data-testid="button-place-bet"
                      >
                        {placeBetMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {useConfidentialBet ? "Encrypting..." : "Placing..."}
                          </>
                        ) : (
                          <>
                            {useConfidentialBet ? <Lock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {useConfidentialBet ? "Private Bet" : `Bet ${selectedSide?.toUpperCase() || "..."}`}
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>

                {selectedSide && betAmount && parseFloat(betAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`mt-4 p-3 rounded-lg ${
                      useConfidentialBet ? "bg-black border border-[#4ADE80]/30" : "bg-zinc-900"
                    }`}
                  >
                    <p className={`text-sm ${useConfidentialBet ? "text-[#4ADE80]/80 font-mono" : "text-gray-400"}`}>
                      {useConfidentialBet ? (
                        <>
                          <Lock className="w-3.5 h-3.5 inline mr-1" />
                          Betting <span className="text-[#4ADE80] font-bold">{betAmount} SOL</span> on{" "}
                          <span className={selectedSide === "yes" ? "text-green-400" : "text-red-400"}>
                            {selectedSide.toUpperCase()}
                          </span>
                          <span className="text-[#4ADE80]/50 ml-2">(amount will be encrypted)</span>
                        </>
                      ) : (
                        <>
                          You're betting <span className="text-white font-bold">{betAmount} SOL</span> on{" "}
                          <span className={selectedSide === "yes" ? "text-green-400" : "text-red-400"}>
                            {selectedSide.toUpperCase()}
                          </span>
                        </>
                      )}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {!canBet && (
              <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
                <p className="text-gray-400">
                  {isResolved 
                    ? `This market has been resolved. Outcome: ${market.outcome?.toUpperCase()}`
                    : "This market is pending resolution"
                  }
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Created by: {market.creatorAddress.slice(0, 6)}...{market.creatorAddress.slice(-4)}</span>
              <span>Resolution: {new Date(market.resolutionDate).toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
