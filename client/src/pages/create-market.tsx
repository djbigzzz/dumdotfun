import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Target, Calendar, AlertCircle, CheckCircle, Loader2, ArrowLeft, Coins } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { Link } from "wouter";

const CREATION_FEE = 0.05; // SOL
const MIN_INITIAL_BET = 0.5; // SOL

interface MarketFormData {
  question: string;
  description: string;
  tokenMint: string;
  resolutionDate: string;
  initialBetSide: "yes" | "no";
  initialBetAmount: number;
}

export default function CreateMarket() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { connectedWallet, connectWallet } = useWallet();
  const connected = !!connectedWallet;
  const publicKey = connectedWallet;
  
  const searchParams = new URLSearchParams(searchString);
  const prefilledToken = searchParams.get("token");
  const prefilledTokenName = searchParams.get("name");
  
  const [formData, setFormData] = useState<MarketFormData>({
    question: "",
    description: "",
    tokenMint: prefilledToken || "",
    resolutionDate: "",
    initialBetSide: "yes",
    initialBetAmount: MIN_INITIAL_BET,
  });
  const [error, setError] = useState<string | null>(null);
  
  const totalCost = CREATION_FEE + formData.initialBetAmount;

  useEffect(() => {
    if (prefilledToken) {
      setFormData(prev => ({
        ...prev,
        tokenMint: prefilledToken,
      }));
    }
  }, [prefilledToken]);

  // Redirect if no token specified - predictions must be token-specific
  if (!prefilledToken) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Target className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">No Token Selected</h1>
          <p className="text-gray-400 mb-6">Predictions must be created for a specific token.</p>
          <Link href="/tokens">
            <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-6 py-3 rounded-lg">
              Browse Tokens
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const createMarketMutation = useMutation({
    mutationFn: async (data: MarketFormData) => {
      // Step 1: Prepare market creation (get transaction to sign)
      const prepareResponse = await fetch("/api/markets/prepare-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: data.question,
          description: data.description,
          tokenMint: data.tokenMint,
          resolutionDate: data.resolutionDate,
          creatorAddress: publicKey,
          initialBetSide: data.initialBetSide,
          initialBetAmount: data.initialBetAmount,
        }),
      });
      
      if (!prepareResponse.ok) {
        const errorData = await prepareResponse.json();
        throw new Error(errorData.error || "Failed to prepare market creation");
      }
      
      const prepareData = await prepareResponse.json();
      const { pendingMarketId, transaction, totalCost: cost } = prepareData;

      // Step 2: Sign transaction with Phantom wallet
      const phantom = (window as any).phantom?.solana;
      if (!phantom) {
        throw new Error("Phantom wallet not found");
      }

      const { Transaction } = await import("@solana/web3.js");
      const txBuffer = Buffer.from(transaction, "base64");
      const tx = Transaction.from(txBuffer);
      
      let signedTx;
      try {
        signedTx = await phantom.signTransaction(tx);
      } catch (signError: any) {
        if (signError.message?.includes("User rejected")) {
          throw new Error("Transaction cancelled by user");
        }
        throw new Error("Failed to sign transaction: " + signError.message);
      }

      // Step 3: Send signed transaction
      const { Connection } = await import("@solana/web3.js");
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      // Step 4: Confirm market creation with server
      const confirmResponse = await fetch("/api/markets/confirm-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingMarketId,
          signature,
        }),
      });
      
      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || "Failed to confirm market creation");
      }
      
      return confirmResponse.json();
    },
    onSuccess: (data) => {
      setLocation(`/market/${data.market.id}`);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!connected) {
      await connectWallet();
      return;
    }

    if (formData.question.trim().length < 10) {
      setError("Question must be at least 10 characters");
      return;
    }

    if (!formData.resolutionDate) {
      setError("Resolution date is required");
      return;
    }

    const resolutionDate = new Date(formData.resolutionDate);
    if (resolutionDate <= new Date()) {
      setError("Resolution date must be in the future");
      return;
    }

    if (formData.initialBetAmount < MIN_INITIAL_BET) {
      setError(`Minimum initial bet is ${MIN_INITIAL_BET} SOL`);
      return;
    }

    createMarketMutation.mutate(formData);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {prefilledToken && (
          <Link href={`/token/${prefilledToken}`}>
            <button className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-mono mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to {prefilledTokenName || "token"}
            </button>
          </Link>
        )}
        
        <div className="bg-purple-100 border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-4">
          <p className="text-sm font-bold text-purple-800">
            DEVNET: Creating a market requires {totalCost.toFixed(2)} SOL from your wallet (Phantom signing required).
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-yellow-600/30 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
              <Target className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">CREATE PREDICTION MARKET</h1>
              <p className="text-gray-400 text-sm">
                {prefilledTokenName 
                  ? `Create a prediction for ${prefilledTokenName}` 
                  : "Ask a question, let the crowd predict"}
              </p>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-600/20 border border-red-600/50 rounded-lg flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                QUESTION *
              </label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Will Bitcoin hit $100,000 by end of 2025?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                data-testid="input-question"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.question.length}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                DESCRIPTION (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add more context about the prediction..."
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                data-testid="input-description"
              />
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">CREATING PREDICTION FOR</p>
              <p className="text-white font-bold">{prefilledTokenName || "Token"}</p>
              <p className="text-xs text-gray-500 font-mono mt-1 truncate">{formData.tokenMint}</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                RESOLUTION DATE *
              </label>
              <input
                type="date"
                value={formData.resolutionDate}
                onChange={(e) => setFormData({ ...formData, resolutionDate: e.target.value })}
                min={minDateStr}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                data-testid="input-resolution-date"
              />
              <p className="mt-1 text-xs text-gray-500">
                The date when the outcome will be determined
              </p>
            </div>

            <div className="bg-zinc-800/50 border border-yellow-600/30 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">
                  <Coins className="w-4 h-4 inline mr-1" />
                  YOUR INITIAL BET *
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Place your first bet to seed the market. Minimum {MIN_INITIAL_BET} SOL.
                </p>
                
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, initialBetSide: "yes" })}
                    className={`flex-1 py-3 rounded-lg font-bold uppercase transition-all ${
                      formData.initialBetSide === "yes"
                        ? "bg-green-500 text-black"
                        : "bg-zinc-700 text-gray-400 hover:bg-zinc-600"
                    }`}
                    data-testid="button-bet-yes"
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, initialBetSide: "no" })}
                    className={`flex-1 py-3 rounded-lg font-bold uppercase transition-all ${
                      formData.initialBetSide === "no"
                        ? "bg-red-500 text-white"
                        : "bg-zinc-700 text-gray-400 hover:bg-zinc-600"
                    }`}
                    data-testid="button-bet-no"
                  >
                    NO
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.initialBetAmount}
                    onChange={(e) => setFormData({ ...formData, initialBetAmount: Math.max(MIN_INITIAL_BET, Number(e.target.value) || MIN_INITIAL_BET) })}
                    min={MIN_INITIAL_BET}
                    step="0.1"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                    data-testid="input-bet-amount"
                  />
                  <span className="text-gray-400 font-bold">SOL</span>
                </div>
              </div>

              <div className="border-t border-zinc-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Creation Fee</span>
                  <span className="text-white font-mono">{CREATION_FEE} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Initial Bet ({formData.initialBetSide.toUpperCase()})</span>
                  <span className="text-white font-mono">{formData.initialBetAmount.toFixed(2)} SOL</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-zinc-600 pt-2 mt-2">
                  <span className="text-yellow-500">Total Cost</span>
                  <span className="text-yellow-500 font-mono">{totalCost.toFixed(2)} SOL</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              {!connected ? (
                <motion.button
                  type="button"
                  onClick={() => connectWallet()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-black py-4 rounded-lg uppercase transition-all"
                  data-testid="button-connect-wallet"
                >
                  Connect Wallet to Create
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={createMarketMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-black py-4 rounded-lg uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  data-testid="button-create-market"
                >
                  {createMarketMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Create Market
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
