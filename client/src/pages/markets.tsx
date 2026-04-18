import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Target, Clock, TrendingUp, Loader2, Filter, ArrowUpDown } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";

interface MarketListItem {
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
  totalPositions?: number;
  survivalCriteria?: string;
}

type StatusFilter = "open" | "ending_soon" | "resolved" | "all";
type SortFilter = "newest" | "volume" | "ending_soon";

const STATUS_LABELS: Record<StatusFilter, string> = {
  open: "Live",
  ending_soon: "Ending in 24h",
  resolved: "Resolved",
  all: "All",
};

const SORT_LABELS: Record<SortFilter, string> = {
  newest: "Newest",
  volume: "Most volume",
  ending_soon: "Ending soonest",
};

function timeLeftLabel(resolutionDate: string): { text: string; urgent: boolean; ended: boolean } {
  const diff = new Date(resolutionDate).getTime() - Date.now();
  if (diff <= 0) return { text: "Ended", urgent: false, ended: true };
  const hours = diff / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return { text: `${days}d ${Math.floor(hours % 24)}h left`, urgent: false, ended: false };
  if (hours >= 1) return { text: `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m left`, urgent: hours < 1, ended: false };
  const mins = Math.floor(diff / (1000 * 60));
  return { text: `${mins}m left`, urgent: true, ended: false };
}

export default function MarketsPage() {
  usePageTitle(undefined, "Prediction Markets — Dum.fun", {
    description: "Bet on token survival, rugs, graduations and more on Solana Devnet.",
  });

  const [status, setStatus] = useState<StatusFilter>("open");
  const [sort, setSort] = useState<SortFilter>("volume");

  const { data, isLoading } = useQuery<MarketListItem[]>({
    queryKey: ["markets", status, sort],
    queryFn: async () => {
      const res = await fetch(`/api/markets?status=${status}&sort=${sort}&limit=100`);
      if (!res.ok) throw new Error("Failed to fetch markets");
      return res.json();
    },
    staleTime: 30000,
  });

  const markets = data || [];

  const stats = useMemo(() => {
    const totalVolume = markets.reduce((s, m) => s + (m.totalVolume || 0), 0);
    return {
      count: markets.length,
      volume: totalVolume,
    };
  }, [markets]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-7 h-7 text-yellow-400" />
            <h1 className="text-3xl font-black text-white">Prediction Markets</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Bet on what happens to launchpad tokens. All markets resolve automatically from Solana on-chain data.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Markets</p>
            <p className="text-2xl font-black text-white">{stats.count}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Volume</p>
            <p className="text-2xl font-black text-yellow-400">{stats.volume.toFixed(2)} SOL</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 col-span-2 md:col-span-1">
            <p className="text-xs text-gray-500 uppercase font-bold">Resolution</p>
            <p className="text-sm text-white mt-1">Auto from on-chain data</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(key => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                    status === key
                      ? "bg-yellow-500 text-black"
                      : "bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                  data-testid={`filter-status-${key}`}
                >
                  {STATUS_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-500" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortFilter)}
              className="bg-zinc-800 border border-zinc-700 rounded text-xs text-white px-3 py-1.5 focus:outline-none focus:border-yellow-500"
              data-testid="select-sort"
            >
              {(Object.keys(SORT_LABELS) as SortFilter[]).map(key => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        ) : markets.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No markets match these filters yet.</p>
            <Link href="/tokens">
              <button className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded-lg text-sm">
                Browse tokens to create one
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {markets.map((m, i) => {
              const tl = timeLeftLabel(m.resolutionDate);
              const hasConsensus = (m.totalPositions || 0) >= 2;
              const isResolved = m.status === "resolved";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                >
                  <Link href={`/market/${m.id}`}>
                    <button
                      className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-yellow-600/50 rounded-xl p-4 transition-all hover:-translate-y-0.5"
                      data-testid={`card-market-${m.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-white font-bold text-base leading-snug flex-1">{m.question}</h3>
                        {isResolved ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-600/20 text-gray-300 flex-shrink-0">
                            {m.outcome?.toUpperCase()}
                          </span>
                        ) : tl.ended ? (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 flex-shrink-0">
                            Resolving
                          </span>
                        ) : (
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                            tl.urgent ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-gray-300"
                          }`}>
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                            {tl.text}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {(m.totalVolume || 0).toFixed(2)} SOL
                        </span>
                        <span>{m.totalPositions || 0} bets</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-500/5 border border-green-500/20 rounded px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-green-400 uppercase">Yes</span>
                            <span className="text-sm font-black text-green-400">
                              {hasConsensus ? `${m.yesOdds}%` : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/20 rounded px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-red-400 uppercase">No</span>
                            <span className="text-sm font-black text-red-400">
                              {hasConsensus ? `${m.noOdds}%` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!hasConsensus && !isResolved && (
                        <p className="text-[10px] text-yellow-400/70 mt-2">No consensus yet — be first to set the line</p>
                      )}
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
