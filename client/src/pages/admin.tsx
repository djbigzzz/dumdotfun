import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, Shield, Wallet } from "lucide-react";
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

export default function AdminPage() {
  const { connectedWallet, connectWallet } = useWallet();
  const [isInitializing, setIsInitializing] = useState(false);

  const { data: status, isLoading, refetch } = useQuery<PlatformStatus>({
    queryKey: ["bonding-curve-status"],
    queryFn: async () => {
      const res = await fetch("/api/bonding-curve/status");
      return res.json();
    },
    refetchInterval: 5000,
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

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Connected wallet: {connectedWallet || "Not connected"}</p>
        </div>
      </div>
    </Layout>
  );
}
