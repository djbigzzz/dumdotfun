import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, Shield, Wallet, Clock, Gavel, TrendingUp, TrendingDown } from "lucide-react";
import { Buffer } from "buffer";
import { Connection, Transaction } from "@solana/web3.js";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

interface PlatformStatus {
  programId: string;
  feeRecipient: string;
  platformInitialized: boolean;
}

interface ExpiredMarket {
  id: string;
  question: string;
  tokenMint: string;
  resolutionDate: string;
  yesPool: string;
  noPool: string;
  totalBets: number;
}

interface ResolutionResult {
  marketId: string;
  question: string;
  outcome: "yes" | "no";
  reason: string;
  survivalScore: number;
}

export default function AdminPage() {
  const { connectedWallet, connectWallet } = useWallet();
  const [isInitializing, setIsInitializing] = useState(false);
  const queryClient = useQueryClient();

  const { data: status, isLoading, refetch } = useQuery<PlatformStatus>({
    queryKey: ["bonding-curve-status"],
    queryFn: async () => {
      const res = await fetch("/api/bonding-curve/status");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: expiredMarkets, isLoading: loadingExpired } = useQuery<{
    count: number;
    markets: ExpiredMarket[];
  }>({
    queryKey: ["expired-markets"],
    queryFn: async () => {
      const res = await fetch("/api/markets/expired");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const autoResolveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/markets/auto-resolve", { method: "POST" });
      if (!res.ok) throw new Error("Failed to auto-resolve markets");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.resolved > 0) {
        toast.success(`Resolved ${data.resolved} market(s)!`);
      } else {
        toast.info("No markets ready for auto-resolution");
      }
      queryClient.invalidateQueries({ queryKey: ["expired-markets"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      if (!connectedWallet) {
        throw new Error("Connect wallet first");
      }

      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet required");
      }

      setIsInitializing(true);

      const res = await fetch("/api/bonding-curve/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authority: connectedWallet }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to build transaction");
      }

      const { transaction: txBase64 } = await res.json();

      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);

      const signedTx = await phantom.signTransaction(transaction);

      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(signature, "confirmed");

      return { signature };
    },
    onSuccess: (data) => {
      toast.success(`Platform initialized! TX: ${data.signature.slice(0, 8)}...`);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsInitializing(false);
    },
  });

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-black">ADMIN PANEL</h1>
        </div>

        <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-black mb-6">Bonding Curve Platform</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-600">Program ID</span>
                <code className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                  {status?.programId?.slice(0, 8)}...{status?.programId?.slice(-4)}
                </code>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-600">Fee Recipient</span>
                <code className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                  {status?.feeRecipient?.slice(0, 8)}...{status?.feeRecipient?.slice(-4)}
                </code>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-600">Platform Status</span>
                {status?.platformInitialized ? (
                  <span className="flex items-center gap-2 text-green-600 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    INITIALIZED
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-yellow-600 font-bold text-sm">
                    <AlertCircle className="w-4 h-4" />
                    NOT INITIALIZED
                  </span>
                )}
              </div>

              {!status?.platformInitialized && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-4">
                    The platform needs to be initialized before tokens can be created through the bonding curve.
                    This sets your wallet as the fee recipient for all trades.
                  </p>

                  {!connectedWallet ? (
                    <motion.button
                      whileHover={{ y: -2, x: -2 }}
                      whileTap={{ y: 0, x: 0 }}
                      onClick={() => connectWallet()}
                      className="w-full py-3 rounded-lg font-black uppercase bg-red-500 hover:bg-red-600 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2"
                      data-testid="button-connect-admin"
                    >
                      <Wallet className="w-5 h-5" />
                      CONNECT WALLET
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ y: -2, x: -2 }}
                      whileTap={{ y: 0, x: 0 }}
                      onClick={() => initializeMutation.mutate()}
                      disabled={isInitializing}
                      className="w-full py-3 rounded-lg font-black uppercase bg-green-500 hover:bg-green-600 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 disabled:opacity-50"
                      data-testid="button-initialize-platform"
                    >
                      {isInitializing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          INITIALIZING...
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          INITIALIZE PLATFORM
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              )}

              {status?.platformInitialized && (
                <div className="mt-6 p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                  <p className="text-sm text-green-800">
                    Platform is ready! All token creation and trading fees (1%) will be sent directly to your wallet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Market Resolution Section */}
        <div className="mt-8 bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Gavel className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-black">Market Resolution</h2>
            </div>
            {expiredMarkets?.count ? (
              <span className="px-3 py-1 bg-red-100 text-red-600 font-bold text-sm rounded-full border border-red-300">
                {expiredMarkets.count} EXPIRED
              </span>
            ) : null}
          </div>

          {loadingExpired ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : expiredMarkets?.markets?.length ? (
            <div className="space-y-4">
              <div className="flex gap-3 mb-4">
                <motion.button
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  onClick={() => autoResolveMutation.mutate()}
                  disabled={autoResolveMutation.isPending}
                  className="flex-1 py-3 rounded-lg font-black uppercase bg-yellow-500 hover:bg-yellow-600 text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="button-auto-resolve"
                >
                  {autoResolveMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      RESOLVING...
                    </>
                  ) : (
                    <>
                      <Gavel className="w-5 h-5" />
                      AUTO-RESOLVE ALL ({expiredMarkets.count})
                    </>
                  )}
                </motion.button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {expiredMarkets.markets.slice(0, 10).map((market) => (
                  <div
                    key={market.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-sm">{market.question}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expired {new Date(market.resolutionDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            {Number(market.yesPool).toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-500" />
                            {Number(market.noPool).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <code className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                        {market.tokenMint.slice(0, 6)}...
                      </code>
                    </div>
                  </div>
                ))}
              </div>

              {expiredMarkets.count > 10 && (
                <p className="text-center text-sm text-gray-500">
                  +{expiredMarkets.count - 10} more expired markets
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">All markets are up to date</p>
              <p className="text-sm">No expired markets awaiting resolution</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Connected wallet: {connectedWallet || "Not connected"}</p>
        </div>
      </div>
    </Layout>
  );
}
