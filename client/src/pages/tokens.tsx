import { Layout } from "@/components/layout";
import { TokenCard } from "@/components/token-card";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Loader2, AlertCircle, Rocket, Search } from "lucide-react";
import { useState } from "react";

interface TokenPrediction {
  id: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  status: string;
}

interface Token {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  predictions?: TokenPrediction[];
}

export default function TokensPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tokens, isLoading, error } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const filteredTokens = tokens?.filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900">
              Token Feed
            </h1>
            <p className="text-gray-500 mt-1">Browse tokens and bet on predictions</p>
          </div>
          
          <Link href="/create">
            <motion.button
              whileHover={{ y: -2, x: -2 }}
              whileTap={{ y: 0, x: 0 }}
              className="flex items-center gap-2 bg-red-500 text-white font-bold px-6 py-3 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
              data-testid="button-create-token"
            >
              <Plus className="w-5 h-5" />
              Launch Token
            </motion.button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens..."
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-black rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            data-testid="input-search-tokens"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-500">Failed to load tokens</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Rocket className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {searchQuery ? "No tokens found" : "No tokens yet"}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md">
              {searchQuery 
                ? "Try a different search term" 
                : "Be the first to launch a token on dum.fun!"}
            </p>
            {!searchQuery && (
              <Link href="/create">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="bg-red-500 text-white font-bold px-6 py-3 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Launch First Token
                </motion.button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTokens.map((token) => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
