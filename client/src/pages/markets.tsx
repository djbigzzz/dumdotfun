import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Target, Clock, TrendingUp, Loader2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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
type CategoryFilter = "all" | "dev_sells" | "dev_holds" | "graduated" | "recent_activity" | "has_liquidity" | "custom";

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

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "All types",
  dev_sells: "Rugs",
  dev_holds: "Dev holds",
  graduated: "Graduations",
  recent_activity: "Activity",
  has_liquidity: "Liquidity",
  custom: "Custom",
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
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 24;

  useEffect(() => { setPage(0); }, [status, sort, category, search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<{ markets: MarketListItem[]; total: number }>({
    queryKey: ["markets", status, sort, category, search, page],
    queryFn: async () => {
      const offset = page * PAGE_SIZE;
      const params = new URLSearchParams({
        status, sort, category,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (search) params.set("q", search);
      const res = await fetch(`/api/markets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch markets");
      const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
      const markets = await res.json();
      return { markets, total };
    },
    staleTime: 30000,
  });

  const markets = data?.markets || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = useMemo(() => {
    const pageVolume = markets.reduce((s, m) => s + (m.totalVolume || 0), 0);
    return { pageVolume };
  }, [markets]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              <Target className="w-6 h-6 text-yellow-400" />
              Markets
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {total} {total === 1 ? "market" : "markets"} · showing {markets.length} · {stats.pageVolume.toFixed(2)} SOL on this page · auto-resolved on-chain
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by token, question, or mint…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white pl-9 pr-9 py-2 focus:outline-none focus:border-yellow-500"
            data-testid="input-market-search"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white"
              data-testid="button-clear-search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(key => (
              <button
                key={key}
                onClick={() => setStatus(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  status === key
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                }`}
                data-testid={`filter-status-${key}`}
              >
                {STATUS_LABELS[key]}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortFilter)}
            className="ml-auto bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white px-3 py-1.5 focus:outline-none focus:border-yellow-500"
            data-testid="select-sort"
          >
            {(Object.keys(SORT_LABELS) as SortFilter[]).map(key => (
              <option key={key} value={key}>{SORT_LABELS[key]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1">
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map(key => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                category === key
                  ? "bg-red-500 text-white"
                  : "bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-white border border-zinc-800"
              }`}
              data-testid={`filter-category-${key}`}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        ) : markets.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {search ? `No markets match "${search}".` : "No markets match these filters yet."}
            </p>
            {(search || category !== "all" || status !== "all") && (
              <button
                onClick={() => { setSearchInput(""); setCategory("all"); setStatus("all"); }}
                className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-lg text-sm"
                data-testid="button-clear-filters"
              >
                Clear filters
              </button>
            )}
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

        {!isLoading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 pt-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900 text-gray-300 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-prev-page"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <div className="text-xs text-gray-500" data-testid="text-page-info">
              Page {page + 1} of {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900 text-gray-300 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="button-next-page"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
