import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Target, Clock, ArrowLeft, Loader2, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Lock, Shield, Eye, Info, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest } from "@/lib/queryClient";
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
  const { connectedWallet, connectWallet, ensureSession } = useWallet();
  const connected = !!connectedWallet;
  const publicKey = connectedWallet;
  const queryClient = useQueryClient();
  const [betAmount, setBetAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useConfidentialBet, setUseConfidentialBet] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [marketTitle, setMarketTitle] = useState<string | undefined>();
  const [marketMeta, setMarketMeta] = useState<{
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
  } | undefined>();
  usePageTitle(undefined, marketTitle, marketMeta);

  const [success, setSuccess] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { data: market, isLoading, error: fetchError } = useQuery<Market>({
    queryKey: ["market", id],
    queryFn: async () => {
      const res = await fetch(`/api/markets/${id}`);
      if (!res.ok) throw new Error("Market not found");
      const data = await res.json();
      if (data?.question) {
        setMarketTitle(`${data.question} — Prediction Market`);
        const shortDesc = data.description
          ? `${data.description.slice(0, 120)}${data.description.length > 120 ? "..." : ""}`
          : data.question;
        const volume = Number(data.totalVolume) || 0;
        setMarketMeta({
          description: `${shortDesc} — ${volume.toFixed(2)} SOL volume`,
          ogTitle: `${data.question} | Dum.fun Prediction Market`,
          ogDescription: `${shortDesc} — ${volume.toFixed(2)} SOL in volume. Bet on outcomes on Dum.fun.`,
          ogImage: data.imageUri || undefined,
          ogUrl: `https://dum.fun/market/${id}`,
        });
      }
      return data;
    },
  });

  const { data: resolutionData } = useQuery<any>({
    queryKey: ["resolution-status", id],
    queryFn: async () => {
      const res = await fetch(`/api/markets/${id}/resolution-status`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id,
    staleTime: 60000,
  });

  const countdown = useCountdown(market?.resolutionDate || new Date().toISOString());

  const placeBetMutation = useMutation({
    mutationFn: async ({ side, amount, confidential }: { side: "yes" | "no"; amount: number; confidential?: boolean }) => {
      const phantom = (window as any).phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null);
      if (!phantom) {
        throw new Error("Phantom wallet not found");
      }

      try { await ensureSession(); } catch (e: any) {
        throw new Error(e?.message || "Wallet sign-in required");
      }

      // Use confidential betting endpoint if privacy mode is on
      if (confidential) {
        const confidentialRes = await apiRequest("POST", `/api/markets/${id}/confidential-bet`, {
          walletAddress: publicKey,
          side,
          amount,
        });
        return confidentialRes.json();
      }

      // Step 1: Prepare bet (get transaction to sign)
      const prepareRes = await apiRequest("POST", `/api/markets/${id}/prepare-bet`, {
        walletAddress: publicKey,
        side,
        amount,
      });
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
      const confirmRes = await apiRequest("POST", `/api/markets/${id}/confirm-bet`, { betId, signature });
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
          {/* Compact header */}
            <div className="p-5 border-b border-zinc-800">
              <div className="flex items-start gap-3">
                {market.imageUri ? (
                  <img src={market.imageUri} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-yellow-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      market.marketType === "token" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"
                    }`}>
                      {market.marketType === "token" ? "Token" : "General"}
                    </span>
                    {isResolved && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-gray-600/20 text-gray-300" data-testid="badge-resolved">
                        Resolved · {market.outcome?.toUpperCase()}
                      </span>
                    )}
                    {isExpired && !isResolved && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-yellow-500/15 text-yellow-400">
                        Pending
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl md:text-2xl font-black text-white leading-tight">{market.question}</h1>
                </div>
              </div>

              {/* one-line stats strip */}
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 flex-wrap">
                <span data-testid="stat-volume"><span className="text-white font-bold">{market.totalVolume.toFixed(2)}</span> SOL volume</span>
                <span className="text-zinc-600">·</span>
                <span data-testid="stat-positions"><span className="text-white font-bold">{market.totalPositions}</span> bets</span>
                <span className="text-zinc-600">·</span>
                {isResolved ? (
                  <span>Resolved</span>
                ) : isExpired ? (
                  <span className="text-yellow-400">Resolving…</span>
                ) : (
                  <span data-testid="countdown-timer" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {countdown.days > 0 && `${countdown.days}d `}
                    {String(countdown.hours).padStart(2,'0')}h {String(countdown.minutes).padStart(2,'0')}m left
                  </span>
                )}
              </div>
            </div>

            {/* Hero: "If resolved right now" */}
            {!isResolved && resolutionData?.evaluation && (
              <div className="px-5 pt-5" data-testid="section-resolution-preview">
                <div className={`rounded-lg border p-3.5 flex items-start gap-3 ${
                  resolutionData.projectedOutcome === "yes"
                    ? "bg-green-500/5 border-green-500/30"
                    : "bg-red-500/5 border-red-500/30"
                }`}>
                  {resolutionData.projectedOutcome === "yes"
                    ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">If resolved now</span>
                      <span className={`text-[11px] font-black ${
                        resolutionData.projectedOutcome === "yes" ? "text-green-400" : "text-red-400"
                      }`}>
                        {resolutionData.projectedOutcome.toUpperCase()} would win
                      </span>
                    </div>
                    <p className="text-sm text-gray-200" data-testid="text-projected-reason">
                      {resolutionData.evaluation.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Combined trade panel: YES/NO + bet input together */}
            <div className="p-5">
              {(() => {
                const hasConsensus = (market.totalPositions || 0) >= 2;
                const isRug = criteria === "dev_sells";
                const yesLabel = isRug ? "YES (rugs)" : "YES";
                const noLabel = isRug ? "NO (doesn't)" : "NO";
                return (
                  <>
                    {!hasConsensus && (
                      <p className="text-[11px] text-yellow-400/80 mb-2" data-testid="banner-no-consensus">
                        No consensus yet — be first to set the line.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
                      <button
                        onClick={() => canBet && setSelectedSide("yes")}
                        disabled={!canBet}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedSide === "yes"
                            ? "bg-green-600/25 border-green-500"
                            : canBet
                            ? "bg-green-600/5 border-green-600/30 hover:bg-green-600/15 hover:border-green-500/60"
                            : "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
                        }`}
                        data-testid="button-bet-yes"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-green-400 font-bold text-sm">{yesLabel}</span>
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        </div>
                        <p className="text-3xl font-black text-green-400 mt-1">
                          {hasConsensus ? `${market.yesOdds}%` : "—"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">{market.yesPool.toFixed(2)} SOL pool</p>
                      </button>
                      <button
                        onClick={() => canBet && setSelectedSide("no")}
                        disabled={!canBet}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedSide === "no"
                            ? "bg-red-600/25 border-red-500"
                            : canBet
                            ? "bg-red-600/5 border-red-600/30 hover:bg-red-600/15 hover:border-red-500/60"
                            : "bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed"
                        }`}
                        data-testid="button-bet-no"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-red-400 font-bold text-sm">{noLabel}</span>
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        </div>
                        <p className="text-3xl font-black text-red-400 mt-1">
                          {hasConsensus ? `${market.noOdds}%` : "—"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">{market.noPool.toFixed(2)} SOL pool</p>
                      </button>
                    </div>
                  </>
                );
              })()}

              {canBet && (
                <div className={`rounded-lg p-4 ${
                  useConfidentialBet
                    ? "bg-black border border-[#4ADE80]/40"
                    : "bg-zinc-800/60 border border-zinc-700"
                }`}>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mb-3 px-3 py-2 rounded text-sm font-bold flex items-center gap-2 ${
                        useConfidentialBet
                          ? "bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/40"
                          : "bg-green-500/15 text-green-400 border border-green-500/40"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Bet placed!
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3 px-3 py-2 rounded text-sm bg-red-500/15 border border-red-500/40 text-red-400 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.10"
                      step="0.01"
                      min="0.01"
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500"
                      data-testid="input-bet-amount"
                    />
                    {!connected ? (
                      <button
                        onClick={() => connectWallet()}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-lg whitespace-nowrap"
                        data-testid="button-connect"
                      >
                        Connect
                      </button>
                    ) : (
                      <button
                        onClick={handlePlaceBet}
                        disabled={placeBetMutation.isPending || !selectedSide}
                        className={`font-bold px-5 py-2.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedSide === "yes"
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : selectedSide === "no"
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-zinc-700 text-gray-400"
                        }`}
                        data-testid="button-place-bet"
                      >
                        {placeBetMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> {useConfidentialBet ? "Encrypting" : "Placing"}</>
                        ) : useConfidentialBet ? (
                          <><Lock className="w-4 h-4" /> Private bet</>
                        ) : (
                          <>Bet {selectedSide ? selectedSide.toUpperCase() : "—"}</>
                        )}
                      </button>
                    )}
                  </div>

                  {selectedSide && betAmount && parseFloat(betAmount) > 0 && (
                    <p className={`mt-2 text-xs ${useConfidentialBet ? "text-[#4ADE80]/70 font-mono" : "text-gray-400"}`}>
                      {useConfidentialBet && <Lock className="w-3 h-3 inline mr-1" />}
                      Betting <span className="text-white font-bold">{betAmount} SOL</span> on{" "}
                      <span className={selectedSide === "yes" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {selectedSide.toUpperCase()}
                      </span>
                      {useConfidentialBet && <span className="text-[#4ADE80]/50"> — amount encrypted on-chain</span>}
                    </p>
                  )}

                  {/* Privacy toggle — small inline link */}
                  <div className="mt-3 pt-3 border-t border-zinc-700/60 flex items-center justify-between">
                    <button
                      onClick={() => setUseConfidentialBet(!useConfidentialBet)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                        useConfidentialBet ? "text-[#4ADE80]" : "text-gray-400 hover:text-white"
                      }`}
                      data-testid="button-toggle-confidential"
                    >
                      {useConfidentialBet ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {useConfidentialBet ? "Private (FHE)" : "Make this bet private"}
                    </button>
                    <button
                      onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                      className="text-gray-500 hover:text-gray-300"
                      data-testid="button-privacy-info"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {showPrivacyInfo && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] text-gray-500 mt-2 leading-relaxed"
                      >
                        Private bets encrypt the amount on-chain via Encrypt FHE — pool sizes update without revealing your stake.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {!canBet && (
                <div className="bg-zinc-800/50 rounded-lg p-4 text-center text-sm text-gray-400">
                  {isResolved
                    ? `This market resolved ${market.outcome?.toUpperCase()}`
                    : "Market closed — pending resolution"}
                </div>
              )}
            </div>

            {/* Collapsible: Rules & on-chain status */}
            <div className="border-t border-zinc-800">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                data-testid="button-toggle-details"
              >
                <span className="text-sm font-bold text-gray-300">Rules & on-chain status</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="bg-green-500/5 border border-green-500/20 rounded p-3">
                          <p className="text-[10px] uppercase font-bold text-green-400 mb-1">YES wins if</p>
                          <p className="text-xs text-gray-300 leading-snug">
                            {resolutionData?.rules?.yesCondition || getCriteriaDescription(criteria)}
                          </p>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/20 rounded p-3">
                          <p className="text-[10px] uppercase font-bold text-red-400 mb-1">NO wins if</p>
                          <p className="text-xs text-gray-300 leading-snug">
                            {resolutionData?.rules?.noCondition || "The opposite of the YES condition is met."}
                          </p>
                        </div>
                      </div>

                      {resolutionData?.health && (
                        <div className="bg-zinc-800/40 rounded p-3">
                          <p className="text-[10px] uppercase font-bold text-blue-400 mb-2">Live on-chain status</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                            {resolutionData.health.creatorBalancePercent !== null && (
                              <>
                                <span className="text-gray-400">Dev holdings</span>
                                <span className="text-right font-mono text-white">{resolutionData.health.creatorBalancePercent}%</span>
                              </>
                            )}
                            <span className="text-gray-400">Holders</span>
                            <span className="text-right font-mono text-white">{resolutionData.health.holderCount}</span>
                            <span className="text-gray-400">Liquidity</span>
                            <span className={`text-right font-mono ${resolutionData.health.hasLiquidity ? "text-green-400" : "text-red-400"}`}>
                              {resolutionData.health.hasLiquidity ? "Active" : "None"}
                            </span>
                            <span className="text-gray-400">Recent activity</span>
                            <span className={`text-right font-mono ${resolutionData.health.criteria.recent_activity ? "text-green-400" : "text-red-400"}`}>
                              {resolutionData.health.criteria.recent_activity ? `${resolutionData.health.lastTradeAge}d ago` : "None"}
                            </span>
                            <span className="text-gray-400">Survival score</span>
                            <span className={`text-right font-mono ${
                              resolutionData.health.survivalScore >= 75 ? "text-green-400" :
                              resolutionData.health.survivalScore >= 50 ? "text-yellow-400" : "text-red-400"
                            }`}>{resolutionData.health.survivalScore}/100</span>
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-gray-500 leading-relaxed">
                        Resolves <span className="text-gray-300 font-mono">{new Date(market.resolutionDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span> · {isAutoResolve ? "Auto from Solana on-chain data" : "Manual resolution"} · Source: Helius RPC
                      </div>

                      <div className="text-[11px] text-gray-500">
                        Payout = (your bet ÷ winning pool) × total pool · Created by <span className="font-mono">{market.creatorAddress.slice(0,6)}…{market.creatorAddress.slice(-4)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href="https://encrypt.xyz" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-[#4ADE80]/10 border border-[#4ADE80]/30 text-[#4ADE80] text-[10px] font-bold"
                          data-testid="badge-encrypt-fhe"
                        >
                          <Lock className="w-3 h-3" /> Encrypt FHE
                        </a>
                        <a
                          href="https://ika.xyz" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold"
                          data-testid="badge-ika-dwallet"
                        >
                          <Shield className="w-3 h-3" /> Ika dWallets
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </motion.div>
      </div>
    </Layout>
  );
}
