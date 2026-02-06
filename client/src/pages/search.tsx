import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search as SearchIcon, Loader2, X } from "lucide-react";
import { useState } from "react";
import { usePrivacy } from "@/lib/privacy-context";

interface Token {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
}

interface Market {
  id: number;
  question: string;
  tokenSymbol: string;
  status: string;
  totalVolume: string;
}

interface SolPrice {
  price: number;
  currency: string;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(2)}`;
  return "$0.00";
}

export default function SearchPage() {
  const { privateMode } = usePrivacy();
  const [query, setQuery] = useState("");

  const { data: tokens, isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const { data: markets } = useQuery<Market[]>({
    queryKey: ["prediction-markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json();
    },
  });

  const { data: solPrice } = useQuery<SolPrice>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
  });

  const q = query.toLowerCase().trim();

  const filteredTokens = q.length > 0
    ? (tokens || []).filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.mint.toLowerCase().includes(q)
      )
    : [];

  const filteredMarkets = q.length > 0
    ? (markets || []).filter(m =>
        m.question.toLowerCase().includes(q) ||
        m.tokenSymbol.toLowerCase().includes(q)
      )
    : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className={`relative`}>
          <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={privateMode ? "search tokens, markets..." : "Search tokens, markets..."}
            autoFocus
            className={`w-full pl-12 pr-10 py-4 text-lg border-2 outline-none transition-all ${
              privateMode
                ? "bg-black border-[#4ADE80]/50 text-white placeholder-[#4ADE80]/30 focus:border-[#4ADE80] font-mono"
                : "bg-white border-black rounded-lg placeholder-gray-400 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            }`}
            data-testid="input-search"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80]" : "text-gray-400 hover:text-gray-600"}`}
              data-testid="button-clear-search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {q.length === 0 && (
          <div className={`text-center py-16 ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
            <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-bold">{privateMode ? "// type to search" : "Search for anything"}</p>
            <p className="text-sm mt-1">{privateMode ? "tokens, markets, wallets" : "Tokens, markets, wallet addresses"}</p>
          </div>
        )}

        {q.length > 0 && filteredTokens.length === 0 && filteredMarkets.length === 0 && (
          <div className={`text-center py-16 ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
            <p className="text-lg font-bold">{privateMode ? "// no results" : "No results found"}</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}

        {filteredTokens.length > 0 && (
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-wide mb-3 ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
              {privateMode ? `> TOKENS (${filteredTokens.length})` : `Tokens (${filteredTokens.length})`}
            </h2>
            <div className="space-y-2">
              {filteredTokens.map((token) => (
                <Link key={token.mint} href={`/token/${token.mint}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                      privateMode
                        ? "bg-black border border-[#4ADE80]/30 hover:border-[#4ADE80]"
                        : "bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                    data-testid={`search-token-${token.mint}`}
                  >
                    <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border ${privateMode ? "border-[#4ADE80]/30" : "border-black"}`}>
                      {token.imageUri ? (
                        <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center font-black text-sm ${privateMode ? "bg-black text-[#4ADE80]" : "bg-red-500 text-white"}`}>
                          {token.symbol[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${privateMode ? "text-white" : "text-gray-900"}`}>
                        {token.name}
                      </div>
                      <div className={`text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                        ${token.symbol}
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>
                      {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredMarkets.length > 0 && (
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-wide mb-3 ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
              {privateMode ? `> MARKETS (${filteredMarkets.length})` : `Markets (${filteredMarkets.length})`}
            </h2>
            <div className="space-y-2">
              {filteredMarkets.map((market) => (
                <Link key={market.id} href={`/market/${market.id}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                      privateMode
                        ? "bg-black border border-[#4ADE80]/30 hover:border-[#4ADE80]"
                        : "bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    }`}
                    data-testid={`search-market-${market.id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                      privateMode ? "border-[#4ADE80]/30 bg-black" : "border-black bg-yellow-500"
                    }`}>
                      <span className="text-lg">📊</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${privateMode ? "text-white" : "text-gray-900"}`}>
                        {market.question}
                      </div>
                      <div className={`text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                        ${market.tokenSymbol} · {market.status}
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
