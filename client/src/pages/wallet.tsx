import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import { Copy, Check, ExternalLink, ArrowLeft, Wallet as WalletIcon, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { WalletName } from "@/components/wallet-name";

interface DuneToken {
  mint: string;
  symbol: string;
  name: string;
  amount: string;
  decimals: number;
  valueUsd: number | null;
}

interface DunePortfolio {
  source: string;
  available: boolean;
  reason?: string;
  walletAddress: string;
  solBalance: string;
  tokens: DuneToken[];
  totalValueUsd: number | null;
}

interface DuneTx {
  txHash: string;
  blockTime: number;
  blockSlot: number;
  signers: string[];
  fee: number;
  type: string;
}

interface DuneActivity {
  source: string;
  available: boolean;
  reason?: string;
  transactions: DuneTx[];
  total: number;
}

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "";
}

function formatUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return "-";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
}

function formatAmount(amount: string, decimals: number): string {
  const n = Number(amount);
  if (!isFinite(n)) return amount;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: Math.min(4, decimals || 0) });
}

function relativeTime(blockTimeSec: number): string {
  if (!blockTimeSec) return "-";
  const diffSec = Math.floor(Date.now() / 1000) - blockTimeSec;
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function WalletPage() {
  const [, params] = useRoute("/wallet/:address");
  const address = params?.address || "";
  const [copied, setCopied] = useState(false);

  const { data: portfolio, isLoading: portfolioLoading, isError: portfolioError } = useQuery<DunePortfolio>({
    queryKey: ["dune-wallet", address],
    queryFn: async () => {
      const res = await fetch(`/api/dune/wallet/${address}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      return res.json();
    },
    enabled: !!address,
    staleTime: 60_000,
    retry: 1,
  });

  const { data: activity, isLoading: activityLoading, isError: activityError } = useQuery<DuneActivity>({
    queryKey: ["dune-wallet-activity", address],
    queryFn: async () => {
      const res = await fetch(`/api/dune/wallet/${address}/activity`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: !!address,
    staleTime: 60_000,
    retry: 1,
  });

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!address) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6 text-center">
          <p className="text-gray-500">No wallet address provided.</p>
        </div>
      </Layout>
    );
  }

  const cardStyle = "rounded-xl border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        {/* Back button */}
        <Link href="/" data-testid="link-back-home">
          <button className="flex items-center gap-1 text-sm font-bold text-gray-600 hover:text-black transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Link>

        {/* Wallet header */}
        <div className={`${cardStyle} p-5`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl border-2 border-black bg-red-500 flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <WalletIcon className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase font-bold text-gray-500 tracking-wider">Wallet</p>
                <p className="text-lg md:text-xl font-bold text-black truncate" data-testid="text-wallet-address">
                  <WalletName address={address} truncate={6} />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={copyAddress}
                className="px-3 py-2 text-xs font-bold uppercase rounded-lg border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                data-testid="button-copy-address"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={`https://solscan.io/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-xs font-bold uppercase rounded-lg border-2 border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
                data-testid="link-solscan"
              >
                Solscan
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Powered by Dune badge - prominent for the bounty */}
          <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mainnet activity</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-300">
                LIVE
              </span>
            </div>
            <a
              href="https://sim.dune.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
              data-testid="badge-powered-by-dune"
            >
              <span>Powered by</span>
              <span className="px-2 py-0.5 rounded bg-black text-white">Dune Sim</span>
            </a>
          </div>
        </div>

        {/* Portfolio summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${cardStyle} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total value</p>
            <p className="text-2xl font-black mt-1" data-testid="text-total-value">
              {portfolioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : formatUsd(portfolio?.totalValueUsd ?? null)}
            </p>
          </div>
          <div className={`${cardStyle} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">SOL balance</p>
            <p className="text-2xl font-black mt-1" data-testid="text-sol-balance">
              {portfolioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : Number(portfolio?.solBalance || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
          </div>
          <div className={`${cardStyle} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tokens held</p>
            <p className="text-2xl font-black mt-1" data-testid="text-token-count">
              {portfolioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (portfolio?.tokens.length || 0)}
            </p>
          </div>
        </div>

        {/* Token holdings */}
        <div className={`${cardStyle} p-4 md:p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black uppercase">Holdings</h2>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          {portfolioLoading ? (
            <div className="py-8 flex items-center justify-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Fetching mainnet portfolio...
            </div>
          ) : portfolioError ? (
            <div className="py-8 text-center" data-testid="error-portfolio">
              <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <p className="text-sm text-gray-700 font-semibold">Could not reach on-chain analytics.</p>
              <p className="text-xs text-gray-400 mt-1">Check your connection and try again.</p>
            </div>
          ) : portfolio && !portfolio.available ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">
                {portfolio.reason === "not_configured"
                  ? "On-chain analytics not configured."
                  : "Mainnet data temporarily unavailable."}
              </p>
            </div>
          ) : !portfolio?.tokens || portfolio.tokens.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500" data-testid="text-no-holdings">
                No tokens held on mainnet.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                This wallet may only be active on devnet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-holdings">
                <thead>
                  <tr className="text-left border-b-2 border-black text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-2">Token</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.tokens
                    .slice()
                    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
                    .slice(0, 25)
                    .map((tok) => (
                      <motion.tr
                        key={tok.mint}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        data-testid={`row-token-${tok.mint}`}
                      >
                        <td className="py-2.5">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate">{tok.symbol || "Unknown"}</span>
                            <span className="text-[10px] text-gray-400 font-mono truncate">{shortAddr(tok.mint)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-semibold">
                          {formatAmount(tok.amount, tok.decimals)}
                        </td>
                        <td className="py-2.5 text-right font-semibold">
                          {formatUsd(tok.valueUsd)}
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
              {portfolio.tokens.length > 25 && (
                <p className="text-[10px] text-gray-400 text-right mt-2">
                  Showing top 25 of {portfolio.tokens.length} holdings
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className={`${cardStyle} p-4 md:p-5`}>
          <h2 className="text-lg font-black uppercase mb-3">Recent transactions</h2>
          {activityLoading ? (
            <div className="py-8 flex items-center justify-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading transactions...
            </div>
          ) : activityError ? (
            <div className="py-8 text-center" data-testid="error-activity">
              <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
              <p className="text-sm text-gray-700 font-semibold">Could not load transactions.</p>
              <p className="text-xs text-gray-400 mt-1">Check your connection and try again.</p>
            </div>
          ) : activity && !activity.available ? (
            <div className="py-8 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Mainnet transactions temporarily unavailable.</p>
            </div>
          ) : !activity?.transactions || activity.transactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500" data-testid="text-no-transactions">
                No mainnet transactions found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead>
                  <tr className="text-left border-b-2 border-black text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-2">Tx hash</th>
                    <th className="py-2">Slot</th>
                    <th className="py-2 text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.transactions.slice(0, 25).map((tx, idx) => (
                    <tr key={`${tx.txHash}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`row-tx-${idx}`}>
                      <td className="py-2.5">
                        {tx.txHash ? (
                          <a
                            href={`https://solscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-600 hover:underline"
                          >
                            {shortAddr(tx.txHash)}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs font-mono text-gray-600">
                        {tx.blockSlot.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right text-xs text-gray-500">
                        {relativeTime(tx.blockTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
