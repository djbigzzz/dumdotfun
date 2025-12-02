import { Layout } from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { Target, Clock, Users, ArrowLeft, Loader2, CheckCircle, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";

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
}

export default function MarketDetail() {
  const { id } = useParams<{ id: string }>();
  const { connectedWallet, connectWallet } = useWallet();
  const connected = !!connectedWallet;
  const publicKey = connectedWallet;
  const queryClient = useQueryClient();
  const [betAmount, setBetAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: market, isLoading, error: fetchError } = useQuery<Market>({
    queryKey: ["market", id],
    queryFn: async () => {
      const res = await fetch(`/api/markets/${id}`);
      if (!res.ok) throw new Error("Market not found");
      return res.json();
    },
  });

  const placeBetMutation = useMutation({
    mutationFn: async ({ side, amount }: { side: "yes" | "no"; amount: number }) => {
      const response = await fetch(`/api/markets/${id}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey,
          side,
          amount,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to place bet");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["market", id] });
      setBetAmount("");
      setSelectedSide(null);
      setError(null);
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

    placeBetMutation.mutate({ side: selectedSide, amount });
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

  const timeLeft = new Date(market.resolutionDate).getTime() - Date.now();
  const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const isResolved = market.status === "resolved";
  const isExpired = timeLeft <= 0 && !isResolved;
  const canBet = !isResolved && !isExpired;

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
              <p className="text-2xl font-black text-white">
                {isResolved ? "Resolved" : isExpired ? "Expired" : daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`}
              </p>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">Current Odds</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => canBet && setSelectedSide("yes")}
                disabled={!canBet}
                className={`p-6 rounded-xl border-2 transition-all ${
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
                <p className="text-4xl font-black text-green-400">{market.yesOdds}%</p>
                <p className="text-sm text-gray-500 mt-2">{market.yesPool.toFixed(2)} SOL in pool</p>
              </button>
              <button
                onClick={() => canBet && setSelectedSide("no")}
                disabled={!canBet}
                className={`p-6 rounded-xl border-2 transition-all ${
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
                <p className="text-4xl font-black text-red-400">{market.noOdds}%</p>
                <p className="text-sm text-gray-500 mt-2">{market.noPool.toFixed(2)} SOL in pool</p>
              </button>
            </div>

            {canBet && (
              <div className="bg-zinc-800/50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Place Your Bet</h3>
                
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
                        onClick={connectWallet}
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
                            Placing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Bet {selectedSide?.toUpperCase() || "..."}
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
                    className="mt-4 p-3 bg-zinc-900 rounded-lg"
                  >
                    <p className="text-sm text-gray-400">
                      You're betting <span className="text-white font-bold">{betAmount} SOL</span> on{" "}
                      <span className={selectedSide === "yes" ? "text-green-400" : "text-red-400"}>
                        {selectedSide.toUpperCase()}
                      </span>
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
