import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Target, Calendar, AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { Link } from "wouter";

interface MarketFormData {
  question: string;
  description: string;
  marketType: "general" | "token";
  tokenMint: string;
  resolutionDate: string;
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
    marketType: prefilledToken ? "token" : "general",
    tokenMint: prefilledToken || "",
    resolutionDate: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledToken) {
      setFormData(prev => ({
        ...prev,
        marketType: "token",
        tokenMint: prefilledToken,
      }));
    }
  }, [prefilledToken]);

  const createMarketMutation = useMutation({
    mutationFn: async (data: MarketFormData) => {
      const response = await fetch("/api/markets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          creatorAddress: publicKey,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create market");
      }
      
      return response.json();
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

            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                MARKET TYPE
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, marketType: "general", tokenMint: "" })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.marketType === "general"
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                      : "bg-zinc-800 border-zinc-700 text-gray-400 hover:border-zinc-600"
                  }`}
                  data-testid="button-type-general"
                >
                  <span className="block font-bold">GENERAL</span>
                  <span className="block text-xs mt-1 opacity-70">Crypto, sports, events, etc.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, marketType: "token" })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.marketType === "token"
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-zinc-800 border-zinc-700 text-gray-400 hover:border-zinc-600"
                  }`}
                  data-testid="button-type-token"
                >
                  <span className="block font-bold">TOKEN</span>
                  <span className="block text-xs mt-1 opacity-70">About a specific token</span>
                </button>
              </div>
            </div>

            {formData.marketType === "token" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  TOKEN MINT ADDRESS
                </label>
                <input
                  type="text"
                  value={formData.tokenMint}
                  onChange={(e) => setFormData({ ...formData, tokenMint: e.target.value })}
                  placeholder="Enter token mint address..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono text-sm"
                  data-testid="input-token-mint"
                />
              </motion.div>
            )}

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

            <div className="pt-4">
              {!connected ? (
                <motion.button
                  type="button"
                  onClick={connectWallet}
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
