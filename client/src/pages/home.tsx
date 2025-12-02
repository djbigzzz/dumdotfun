import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Flame, TrendingUp, Zap, Crown } from "lucide-react";

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
}

function TokenCard({ token, index }: { token: Token; index: number }) {
  const progressColor = token.bondingCurveProgress > 80 
    ? "bg-green-500" 
    : token.bondingCurveProgress > 50 
    ? "bg-yellow-500" 
    : "bg-red-500";

  return (
    <Link href={`/token/${token.mint}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="bg-zinc-900 border border-red-600/30 rounded-lg p-4 cursor-pointer hover:border-red-500/60 transition-all group"
        data-testid={`card-token-${token.mint}`}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-red-600/20 overflow-hidden flex-shrink-0">
            {token.imageUri ? (
              <img 
                src={token.imageUri} 
                alt={token.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-red-500 font-black text-lg">
                {token.symbol[0]}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-white truncate group-hover:text-red-400 transition-colors">
                {token.name}
              </h3>
              {index === 0 && (
                <Crown className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <p className="text-xs font-mono text-gray-400">${token.symbol}</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-mono text-green-400">
              {token.marketCapSol.toFixed(2)} SOL
            </p>
            <p className="text-xs text-gray-500">mcap</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Bonding Curve</span>
            <span className="font-mono text-yellow-500">{token.bondingCurveProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${token.bondingCurveProgress}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={`h-full ${progressColor} rounded-full`}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono truncate max-w-[100px]">
            {token.creatorAddress.slice(0, 4)}...{token.creatorAddress.slice(-4)}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            NEW
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  const { data: tokens, isLoading, error } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
    refetchInterval: 10000,
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-red-500 flex items-center gap-2">
              <Flame className="w-6 h-6" />
              LIVE TOKENS
            </h2>
            <span className="bg-red-600/20 border border-red-600/50 px-2 py-1 rounded text-xs font-mono text-red-400 animate-pulse">
              REAL-TIME
            </span>
          </div>

          <Link href="/create">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-2 px-4 rounded uppercase text-sm border border-green-400/50"
              data-testid="button-create-token"
            >
              + CREATE TOKEN
            </motion.button>
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          <button data-testid="button-filter-trending" className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Trending
          </button>
          <button data-testid="button-filter-new" className="bg-zinc-800 text-gray-300 font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap hover:bg-zinc-700">
            New
          </button>
          <button data-testid="button-filter-graduating" className="bg-zinc-800 text-gray-300 font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap hover:bg-zinc-700">
            Graduating
          </button>
          <button data-testid="button-filter-graduated" className="bg-zinc-800 text-gray-300 font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap hover:bg-zinc-700">
            Graduated
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-red-600/20 rounded-lg p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-3 h-2 bg-zinc-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 font-mono">Failed to load tokens</p>
            <p className="text-gray-500 text-sm mt-2">Please try again later</p>
          </div>
        ) : tokens && tokens.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tokens.map((token, index) => (
              <TokenCard key={token.mint} token={token} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-400 font-mono">No tokens yet</p>
            <p className="text-gray-500 text-sm">Be the first to create one!</p>
            <Link href="/create">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black py-3 px-6 rounded uppercase border border-green-400/50"
              >
                CREATE YOUR TOKEN
              </motion.button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
