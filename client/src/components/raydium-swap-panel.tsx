import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ArrowDown, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { txToast, friendlyError, pointsAwarded as notifyPoints } from "@/lib/notify";

interface PoolStats {
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
  baseReserve: string;
  quoteReserve: string;
  baseReserveUi: number;
  quoteReserveUi: number;
  priceTokenInSol: number;
  priceSolInToken: number;
  lpSupply: string;
  feeRateBps: number;
  tokenIsBase: boolean;
}

interface RecentSwap {
  signature: string;
  blockTime: number | null;
  side: "buy" | "sell" | "unknown";
  solAmount: number;
  tokenAmount: number;
}

interface PoolResponse {
  success: boolean;
  pool: PoolStats;
  recentSwaps: RecentSwap[];
}

interface QuoteResponse {
  success: boolean;
  quote: {
    inputAmount: string;
    outputAmount: string;
    minOutputAmount: string;
    priceImpactPct: number;
    feeAmount: string;
    baseIn: boolean;
  };
}

interface Props {
  mint: string;
  tokenSymbol: string;
  tokenDecimals?: number;
  raydiumPoolId?: string;
  connectedWallet: string | null;
  signAndSendTransaction: (tx: any) => Promise<string>;
  ensureSession: () => Promise<void>;
  connectWallet: () => void;
  privateMode: boolean;
  cardStyle: string;
  inputStyle: string;
  solBalance?: number | null;
  tokenBalance?: { balance: number } | null;
}

export function RaydiumSwapPanel({
  mint,
  tokenSymbol,
  tokenDecimals = 6,
  raydiumPoolId,
  connectedWallet,
  signAndSendTransaction,
  ensureSession,
  connectWallet,
  privateMode,
  cardStyle,
  inputStyle,
  solBalance,
  tokenBalance,
}: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);

  const { data: poolData, isLoading: poolLoading, refetch: refetchPool } = useQuery<PoolResponse>({
    queryKey: ["raydiumPool", mint],
    queryFn: async () => {
      const res = await fetch(`/api/raydium/pool/${mint}`);
      if (!res.ok) throw new Error("Failed to fetch pool");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const pool = poolData?.pool;

  const amountNum = parseFloat(amount);
  const isValidAmount = !isNaN(amountNum) && amountNum > 0;

  const amountInBaseUnits = useMemo(() => {
    if (!isValidAmount) return null;
    const dec = side === "buy" ? 9 : tokenDecimals;
    return Math.floor(amountNum * Math.pow(10, dec)).toString();
  }, [amount, side, tokenDecimals, isValidAmount, amountNum]);

  const { data: quoteData, isFetching: isQuoting } = useQuery<QuoteResponse>({
    queryKey: ["raydiumQuote", mint, amountInBaseUnits, side],
    queryFn: async () => {
      const res = await fetch(`/api/raydium/swap/quote?mint=${mint}&amount=${amountInBaseUnits}&isBuy=${side === "buy"}`);
      if (!res.ok) throw new Error("Failed to fetch quote");
      return res.json();
    },
    enabled: !!amountInBaseUnits,
    staleTime: 5000,
  });

  const quote = quoteData?.quote;

  const outputDisplay = useMemo(() => {
    if (!quote) return null;
    const outDec = side === "buy" ? tokenDecimals : 9;
    const outAmt = Number(quote.outputAmount) / Math.pow(10, outDec);
    return outAmt;
  }, [quote, side, tokenDecimals]);

  const minOutDisplay = useMemo(() => {
    if (!quote) return null;
    const outDec = side === "buy" ? tokenDecimals : 9;
    return Number(quote.minOutputAmount) / Math.pow(10, outDec);
  }, [quote, side, tokenDecimals]);

  async function handleSwap() {
    if (isSwapping) return;
    if (!connectedWallet) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!isValidAmount || !amountInBaseUnits) {
      toast.error("Enter a valid amount");
      return;
    }

    setIsSwapping(true);
    const txn = txToast(side, side === "buy"
      ? `${amount} SOL into ${tokenSymbol} on Raydium`
      : `${amount} ${tokenSymbol} into SOL on Raydium`);

    try {
      try {
        await ensureSession();
      } catch (e: any) {
        txn.error(e?.message || "Wallet sign-in required");
        return;
      }

      const buildRes = await apiRequest("POST", "/api/raydium/swap/build", {
        userWallet: connectedWallet,
        mint,
        amount: amountInBaseUnits,
        isBuy: side === "buy",
        slippageBps: 500,
      });
      const buildData = await buildRes.json();

      if (!buildData?.success || !buildData?.transaction) {
        txn.error(buildData?.error || "Failed to build swap");
        return;
      }

      const bytes = Uint8Array.from(atob(buildData.transaction), c => c.charCodeAt(0));
      const { Transaction } = await import("@solana/web3.js");
      const tx = Transaction.from(bytes);

      txn.signing();
      const signature = await signAndSendTransaction(tx);
      txn.submitting();

      // Wait for the swap to actually land on-chain before declaring success.
      // sendRawTransaction returns once the RPC accepts the tx, but the swap
      // can still fail (e.g., slippage exceeded). Poll until confirmed or
      // surface the failure to the user.
      const { Connection } = await import("@solana/web3.js");
      const confConn = new Connection("https://api.devnet.solana.com", "confirmed");
      let confirmed = false;
      for (let i = 0; i < 20; i++) {
        try {
          const status = await confConn.getSignatureStatus(signature, { searchTransactionHistory: true });
          const value = status?.value;
          if (value?.err) {
            throw new Error(`Swap failed on chain: ${JSON.stringify(value.err)}`);
          }
          if (value && (value.confirmationStatus === "confirmed" || value.confirmationStatus === "finalized")) {
            confirmed = true;
            break;
          }
        } catch (e: any) {
          if (e?.message?.includes("Swap failed")) throw e;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!confirmed) {
        throw new Error("Swap did not confirm in time - check your wallet before retrying");
      }

      txn.success({
        signature,
        description: side === "buy"
          ? `Bought ${tokenSymbol} for ${amount} SOL on Raydium`
          : `Sold ${amount} ${tokenSymbol} on Raydium`,
      });

      // Server-verified recording: the endpoint refetches the tx, validates
      // signer + mint, and derives canonical side/amount from balance deltas.
      const recordWithRetry = async (): Promise<any> => {
        const delays = [0, 1500, 3500, 6000];
        let lastErr: any;
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
          try {
            const r = await apiRequest("POST", "/api/raydium/swap/record", {
              userWallet: connectedWallet,
              mint,
              signature,
            });
            return await r.json();
          } catch (err) {
            lastErr = err;
          }
        }
        throw lastErr;
      };

      try {
        const recordData = await recordWithRetry();
        if (recordData?.pointsAwarded && Array.isArray(recordData.pointsAwarded)) {
          for (const p of recordData.pointsAwarded) {
            notifyPoints(p.points, p.reason || "First trade");
          }
        }
      } catch (err) {
        console.error("[RaydiumSwap] record failed after retries:", err);
        toast.warning("Swap landed on chain but feed update failed", {
          description: "Refresh in a moment - your balance is correct.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["token", mint] });
      queryClient.invalidateQueries({ queryKey: ["tokenActivity", mint] });
      queryClient.invalidateQueries({ queryKey: ["devnetBalance", connectedWallet] });
      queryClient.invalidateQueries({ queryKey: ["raydiumPool", mint] });
      setAmount("");
    } catch (err: any) {
      console.error("[RaydiumSwap] swap error:", err);
      txn.error(friendlyError(err));
    } finally {
      setIsSwapping(false);
    }
  }

  const showHighImpact = quote && quote.priceImpactPct > 5;
  const inputUnit = side === "buy" ? "SOL" : tokenSymbol;
  const outputUnit = side === "buy" ? tokenSymbol : "SOL";

  return (
    <div className={`${cardStyle} p-4 sticky top-4 space-y-4`} data-testid="panel-raydium-swap">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌊</span>
          <span className={`font-bold text-sm ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
            Swap on Raydium
          </span>
        </div>
        <button
          onClick={() => refetchPool()}
          className={`p-1 transition-opacity ${poolLoading ? "opacity-50" : "opacity-100 hover:opacity-70"}`}
          disabled={poolLoading}
          title="Refresh pool"
          data-testid="button-refresh-pool"
        >
          <RefreshCw className={`w-3 h-3 ${privateMode ? "text-[#4ADE80]" : "text-gray-700"} ${poolLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Pool stats */}
      {pool && (
        <div className={`grid grid-cols-2 gap-2 text-xs font-mono p-2 rounded border ${privateMode ? "border-[#4ADE80]/30 bg-[#4ADE80]/5" : "border-black/10 bg-gray-50"}`}>
          <div>
            <div className={privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}>SOL Liquidity</div>
            <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`} data-testid="text-pool-sol">
              {pool.tokenIsBase ? pool.quoteReserveUi.toFixed(2) : pool.baseReserveUi.toFixed(2)} SOL
            </div>
          </div>
          <div>
            <div className={privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}>Token Liquidity</div>
            <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`} data-testid="text-pool-token">
              {(pool.tokenIsBase ? pool.baseReserveUi : pool.quoteReserveUi).toLocaleString(undefined, { maximumFractionDigits: 0 })} {tokenSymbol}
            </div>
          </div>
          <div className="col-span-2">
            <div className={privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}>Price</div>
            <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`} data-testid="text-pool-price">
              1 {tokenSymbol} = {pool.priceTokenInSol.toExponential(3)} SOL
            </div>
          </div>
        </div>
      )}

      {/* Side toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setSide("buy"); setAmount(""); }}
          className={`flex-1 py-2 font-bold border-2 transition-all text-sm ${
            side === "buy"
              ? privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-green-500 text-white border-green-500"
              : privateMode ? "bg-black text-[#4ADE80]/50 border-[#4ADE80]/30" : "bg-gray-100 text-gray-500 border-gray-300"
          }`}
          data-testid="button-side-buy"
        >
          Buy
        </button>
        <button
          onClick={() => { setSide("sell"); setAmount(""); }}
          className={`flex-1 py-2 font-bold border-2 transition-all text-sm ${
            side === "sell"
              ? "bg-red-500 text-white border-red-500"
              : privateMode ? "bg-black text-[#4ADE80]/50 border-[#4ADE80]/30" : "bg-gray-100 text-gray-500 border-gray-300"
          }`}
          data-testid="button-side-sell"
        >
          Sell
        </button>
      </div>

      {/* Balance display */}
      {connectedWallet && (
        <div className={`flex items-center justify-between text-xs px-1 ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
          <span>Balance:</span>
          <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`} data-testid="text-swap-balance">
            {side === "buy"
              ? `${(solBalance ?? 0).toFixed(4)} SOL`
              : `${(tokenBalance?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tokenSymbol}`}
          </span>
        </div>
      )}

      {/* Amount input */}
      <div className="relative">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className={`w-full px-4 py-3 text-lg font-mono ${inputStyle}`}
          data-testid="input-swap-amount"
        />
        <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
          {inputUnit}
        </span>
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2">
        {side === "buy"
          ? ["0.1", "0.5", "1", "Max"].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  if (amt === "Max") {
                    const bal = solBalance ?? 0;
                    setAmount(Math.max(0, bal - 0.01).toFixed(4));
                  } else {
                    setAmount(amt);
                  }
                }}
                className={`text-xs py-2 font-bold border transition-all ${privateMode ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]/70 hover:border-[#4ADE80]" : "bg-gray-100 border-gray-300 text-gray-600 hover:border-black"}`}
                data-testid={`button-quick-${amt}`}
              >
                {amt}
              </button>
            ))
          : ["25%", "50%", "75%", "Max"].map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  const balance = tokenBalance?.balance ?? 0;
                  if (pct === "Max") {
                    setAmount(balance.toString());
                  } else {
                    const percent = parseInt(pct) / 100;
                    setAmount((balance * percent).toFixed(2));
                  }
                }}
                className={`text-xs py-2 font-bold border transition-all ${privateMode ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]/70 hover:border-[#4ADE80]" : "bg-gray-100 border-gray-300 text-gray-600 hover:border-black"}`}
                data-testid={`button-quick-${pct}`}
              >
                {pct}
              </button>
            ))}
      </div>

      {/* Quote */}
      <AnimatePresence>
        {quote && outputDisplay !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-3 rounded border-2 font-mono text-xs space-y-1 ${privateMode ? "border-[#4ADE80]/30 bg-[#4ADE80]/5" : "border-black/5 bg-gray-50"}`}
          >
            <div className="flex items-center justify-center mb-1">
              <ArrowDown className={`w-3 h-3 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} />
            </div>
            <div className="flex justify-between">
              <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>You receive:</span>
              <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-black"}`} data-testid="text-swap-output">
                {outputDisplay.toLocaleString(undefined, { maximumFractionDigits: side === "buy" ? 2 : 6 })} {outputUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>Min received (5% slip):</span>
              <span className={privateMode ? "text-[#4ADE80]/80" : "text-gray-700"}>
                {(minOutDisplay ?? 0).toLocaleString(undefined, { maximumFractionDigits: side === "buy" ? 2 : 6 })} {outputUnit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>Price impact:</span>
              <span className={showHighImpact ? "text-red-500 font-bold" : (privateMode ? "text-[#4ADE80]" : "text-green-600")} data-testid="text-price-impact">
                {quote.priceImpactPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>Pool fee:</span>
              <span className={privateMode ? "text-[#4ADE80]/80" : "text-gray-700"}>
                {pool ? `${(pool.feeRateBps / 100).toFixed(2)}%` : "—"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button */}
      {!connectedWallet ? (
        <motion.button
          whileHover={{ y: -2, x: -2 }}
          whileTap={{ y: 0, x: 0 }}
          onClick={() => connectWallet()}
          className={`w-full font-bold py-3 border-2 transition-all ${privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}
          data-testid="button-connect-wallet-raydium"
        >
          Connect Wallet
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ y: -2, x: -2 }}
          whileTap={{ y: 0, x: 0 }}
          onClick={handleSwap}
          disabled={!isValidAmount || isQuoting || isSwapping}
          className={`w-full font-bold py-3 border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            side === "buy"
              ? privateMode ? "bg-[#4ADE80] text-black border-[#4ADE80]" : "bg-green-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          }`}
          data-testid="button-execute-swap"
        >
          {isSwapping ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Swapping...
            </span>
          ) : isQuoting ? "Quoting..." : `${side === "buy" ? "Buy" : "Sell"} ${tokenSymbol}`}
        </motion.button>
      )}

      {raydiumPoolId && (
        <a
          href={`https://explorer.solana.com/address/${raydiumPoolId}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-1 text-xs ${privateMode ? "text-[#4ADE80]/60 hover:text-[#4ADE80]" : "text-gray-500 hover:text-gray-900"}`}
          data-testid="link-raydium-pool-explorer"
        >
          <ExternalLink className="w-3 h-3" />
          View pool on explorer
        </a>
      )}
    </div>
  );
}
