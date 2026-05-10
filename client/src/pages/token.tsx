import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest } from "@/lib/queryClient";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Twitter, MessageCircle, Globe, Loader2, Target, Plus, Copy, Check, Eye, Shield, Lock, Share2, BadgeCheck } from "lucide-react";
import { shareContent, hapticFeedback, buildTwitterIntent } from "@/lib/mobile-utils";
import { TokenHoldersCard } from "@/components/token-holders-card";
import { WalletName } from "@/components/wallet-name";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { txToast, pointsAwarded, betPlaced, friendlyError } from "@/lib/notify";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSnsName } from "@/hooks/use-sns";
import { TradingChart } from "@/components/trading-chart";
import { RaydiumSwapPanel } from "@/components/raydium-swap-panel";
import { Buffer } from "buffer";
import { Transaction, Connection } from "@solana/web3.js";
import bs58 from "bs58";

const SOLANA_RPC = "https://api.devnet.solana.com";
import defaultAvatar from "@assets/generated_images/derpy_blob_meme_mascot.png";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

interface TokenPrediction {
  id: string;
  question: string;
  description: string | null;
  yesOdds: number;
  noOdds: number;
  yesPool: number;
  noPool: number;
  totalVolume: number;
  status: string;
  resolutionDate: string;
  createdAt: string;
  survivalCriteria?: string;
  creatorAddress?: string;
}

const DEV_BEHAVIOR_CRITERIA = ["dev_holds", "dev_sells"];
const MIN_BET_SOL = 0.1;

interface TokenDetail {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  twitter: string | null;
  telegram: string | null;
  website: string | null;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  totalSupply: number;
  // Live on-chain curve data (lamports / token base units). Optional in case
  // the token row exists in the DB but the on-chain account hasn't been
  // hydrated yet for some reason.
  curveData?: {
    virtualSolReserves: number;
    virtualTokenReserves: number;
    realSolReserves: number;
    realTokenReserves: number;
    tokenTotalSupply: number;
    isGraduated: boolean;
    creator?: string;
  } | null;
  predictions?: TokenPrediction[];
}

interface SolPrice {
  price: number;
  currency: string;
}

interface TokenActivity {
  id: string;
  activityType: string;
  walletAddress: string | null;
  tokenMint: string | null;
  amount: string | null;
  side: string | null;
  metadata: string | null;
  createdAt: string;
}

interface PricePoint {
  time: number;
  price: number;
  volume: number;
}

interface DuneTransfer {
  from: string;
  to: string;
  amount: string;
  tokenMint: string;
  decimals: number;
  symbol: string;
}

interface DuneTransaction {
  txHash: string;
  blockTime: number;
  blockSlot: number;
  signers: string[];
  fee: number;
  type: string;
  transfers: DuneTransfer[];
}

function formatTimeLeft(resolutionDate: string): string {
  const diff = new Date(resolutionDate).getTime() - Date.now();
  if (diff <= 0) return "Resolving…";
  const hours = diff / 3_600_000;
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d ${Math.floor(hours % 24)}h left`;
  if (hours >= 1) return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m left`;
  return `${Math.floor(diff / 60_000)}m left`;
}

function predictionHasConsensus(p: { totalVolume?: number }): boolean {
  // Treat anything below ~0.05 SOL of pooled volume as "creator seed only" — odds aren't meaningful yet.
  return (p.totalVolume || 0) >= 0.05;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price < 0.00000001) return `$${price.toExponential(2)}`;
  if (price < 0.0001) return `$${price.toFixed(8)}`;
  return `$${price.toFixed(6)}`;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(2)}`;
  return "$0.00";
}

export default function TokenPage() {
  const { mint } = useParams<{ mint: string }>();
  const [, setLocation] = useLocation();
  const { connectedWallet, connectWallet, ensureSession, signAndSendTransaction, signTransaction } = useWallet();
  const privateMode = false;
  const queryClient = useQueryClient();
  const [tokenTitle, setTokenTitle] = useState<string | undefined>();
  const [tokenMeta, setTokenMeta] = useState<{
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
  } | undefined>();
  usePageTitle(undefined, tokenTitle, tokenMeta);
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeQuote, setTradeQuote] = useState<{ amountOut: string; priceImpact: number } | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  // Guard against double-click on the trade button. If the user clicks twice
  // before Phantom finishes signing, we'd build and broadcast the *same* tx
  // twice and Solana returns "transaction already processed" on the second
  // attempt - which surfaces as a scary red error. This ref blocks reentry.
  const [isTrading, setIsTrading] = useState(false);

  // Fetch quote when amount or type changes
  useQuery({
    queryKey: ["trade-quote", mint, tradeAmount, tradeType],
    queryFn: async () => {
      const amount = parseFloat(tradeAmount);
      if (isNaN(amount) || amount <= 0) {
        setTradeQuote(null);
        return null;
      }
      
      setIsQuoting(true);
      try {
        // For buy: amount is SOL (9 decimals = lamports)
        // For sell: amount is tokens (6 decimals)
        const smallestUnit = tradeType === "buy" 
          ? Math.floor(amount * 1e9)  // SOL to lamports
          : Math.floor(amount * 1e6); // tokens to smallest unit
        const res = await fetch(`/api/trade/quote?tokenMint=${mint}&amount=${smallestUnit}&isBuy=${tradeType === "buy"}`);
        const data = await res.json();
        if (data.success && data.quote?.quote) {
          const innerQuote = data.quote.quote;
          setTradeQuote({
            amountOut: innerQuote.outputAmount || "0",
            priceImpact: innerQuote.priceImpact || 0,
          });
        } else {
          setTradeQuote(null);
        }
        return data;
      } catch (err) {
        setTradeQuote(null);
        return null;
      } finally {
        setIsQuoting(false);
      }
    },
    enabled: !!mint && !!tradeAmount && parseFloat(tradeAmount) > 0,
    refetchInterval: 5000,
  });
  const [activeBet, setActiveBet] = useState<{ predictionId: string; side: "yes" | "no" } | null>(null);
  const [betAmount, setBetAmount] = useState("");


  const [copied, setCopied] = useState(false);

  const { data: token, isLoading, error } = useQuery<TokenDetail>({
    queryKey: ["token", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}`);
      if (!res.ok) throw new Error("Failed to fetch token");
      const data = await res.json();
      if (data?.name && data?.symbol) {
        setTokenTitle(`${data.name} ($${data.symbol}) — Trade on Solana`);
        const shortDesc = data.description
          ? `${data.description.slice(0, 120)}${data.description.length > 120 ? "..." : ""}`
          : `${data.name} ($${data.symbol}) — Trade on Solana`;
        setTokenMeta({
          description: `${shortDesc} — MC: ${data.marketCapSol ? Number(data.marketCapSol).toFixed(2) : "0"} SOL`,
          ogTitle: `${data.name} ($${data.symbol}) on Dum.fun`,
          ogDescription: `${shortDesc} — Bonding curve: ${Math.min(Number(data.bondingCurveProgress) || 0, 100).toFixed(0)}% full`,
          ogImage: data.imageUri || undefined,
          ogUrl: `https://dum.fun/token/${mint}`,
        });
      }
      return data;
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });

  const { data: solPrice } = useQuery<SolPrice>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      const data = await res.json();
      if (typeof window !== "undefined") {
        (window as any).lastSolPrice = data.price;
      }
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: creatorSns } = useSnsName(token?.creatorAddress);

  const { data: tokenBalance } = useQuery<{ balance: number }>({
    queryKey: ["token-balance", connectedWallet, mint],
    queryFn: async () => {
      const res = await fetch(`/api/devnet/token-balance/${connectedWallet}/${mint}`);
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: !!connectedWallet && !!mint && tradeType === "sell",
    refetchInterval: 10000,
  });

  const { data: solBalanceData } = useQuery<{ balance: number }>({
    queryKey: ["devnetBalance", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/devnet/balance/${connectedWallet}`);
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: !!connectedWallet,
    refetchInterval: 15000,
  });
  const solBalance = solBalanceData?.balance ?? null;

  const { data: graduationStatus } = useQuery<{
    isGraduated: boolean;
    graduationStatus: string;
    raydiumPoolId: string | null;
    graduationTx: string | null;
    graduatedAt: string | null;
  }>({
    queryKey: ["graduation-status", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/graduation-status`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 15000,
  });

  const { data: tokenActivity } = useQuery<TokenActivity[]>({
    queryKey: ["token-activity", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/activity`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 5000,
  });

  const { data: priceHistory } = useQuery<PricePoint[]>({
    queryKey: ["price-history", mint],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/price-history`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });

  const placeBetMutation = useMutation({
    mutationFn: async ({ marketId, side, amount }: { marketId: string; side: "yes" | "no"; amount: number }) => {
      if (!connectedWallet) throw new Error("Wallet not connected");
      
      try { await ensureSession(); } catch (e: any) {
        throw new Error(e?.message || "Wallet sign-in required");
      }

      // Step 1: Prepare bet (get transaction to sign)
      const prepareRes = await apiRequest("POST", `/api/markets/${marketId}/prepare-bet`, {
        walletAddress: connectedWallet,
        side,
        amount,
      });
      const { transaction: txBase64, betId } = await prepareRes.json();

      // Step 2: Sign transaction with Phantom
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      
      let signedTx;
      try {
        signedTx = await signTransaction(transaction);
      } catch (signError: any) {
        if (signError.message?.includes("User rejected")) {
          throw new Error("Transaction cancelled");
        }
        throw new Error("Failed to sign: " + signError.message);
      }

      // Step 3: Send signed transaction (tolerate "already processed")
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const sigBytes = signedTx.signatures[0]?.signature;
      const precomputedSig = sigBytes ? bs58.encode(sigBytes) : null;
      let signature: string;
      try {
        signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        });
        const conf = await connection.confirmTransaction(signature, "confirmed");
        if (conf.value?.err) {
          throw new Error(`Bet failed on chain: ${JSON.stringify(conf.value.err)}`);
        }
      } catch (sendErr: any) {
        const msg = sendErr?.message || "";
        if ((msg.includes("already been processed") || msg.includes("already processed")) && precomputedSig) {
          signature = precomputedSig;
        } else {
          throw sendErr;
        }
      }

      // Step 4: Confirm bet with server
      const confirmRes = await apiRequest("POST", `/api/markets/${marketId}/confirm-bet`, { betId, signature });
      return confirmRes.json();
    },
    onSuccess: (data, variables) => {
      const stake = Number(variables.amount) || 0;
      const payout = data?.potentialPayout ? Number(data.potentialPayout) : undefined;
      const sideLbl = variables.side === "yes" ? "YES" : "NO";
      const pred = token?.predictions?.find(p => p.id === variables.marketId);
      const baseUrl = window.location.origin?.startsWith("http") ? window.location.origin : "https://dum.fun";
      betPlaced({
        side: variables.side as "yes" | "no",
        amountSol: stake,
        potentialPayoutSol: payout,
        signature: data?.signature,
        marketHref: undefined,
        shareText: pred
          ? `Just bet ${stake.toFixed(2)} SOL ${sideLbl} on "${pred.question}" - join me on Dum.fun`
          : `Just bet ${stake.toFixed(2)} SOL ${sideLbl} on $${token?.symbol ?? "this token"} - Dum.fun`,
        shareUrl: `${baseUrl}/token/${mint}`,
      });
      setActiveBet(null);
      setBetAmount("");
      queryClient.invalidateQueries({ queryKey: ["token", mint] });
    },
    onError: (error: Error) => toast.error("Bet failed", { description: friendlyError(error) }),
  });


  const handleQuickBuy = (amount: number) => {
    setTradeAmount(amount.toString());
    setTradeType("buy");
  };

  const handleCopyAddress = () => {
    if (token) {
      navigator.clipboard.writeText(token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBetClick = (predictionId: string, side: "yes" | "no", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeBet?.predictionId === predictionId && activeBet?.side === side) {
      setActiveBet(null);
    } else {
      setActiveBet({ predictionId, side });
      setBetAmount("");
    }
  };

  const handlePlaceBet = () => {
    if (!activeBet || !betAmount) return;
    placeBetMutation.mutate({
      marketId: activeBet.predictionId,
      side: activeBet.side,
      amount: parseFloat(betAmount),
    });
  };

  const handleTrade = async () => {
    if (isTrading) return;
    if (!connectedWallet || !tradeAmount || !token) {
      toast.error("Please connect wallet and enter amount");
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsTrading(true);
    const isBuy = tradeType === "buy";
    const tx = txToast(isBuy ? "buy" : "sell", isBuy
      ? `${tradeAmount} SOL worth of ${token.symbol}`
      : `${tradeAmount} ${token.symbol}`);

    try {
      const amountInBaseUnits = isBuy
        ? Math.floor(amount * 1e9).toString()
        : Math.floor(amount * 1e6).toString();

      try {
        await ensureSession();
      } catch (e: any) {
        tx.error(e?.message || "Wallet sign-in required");
        return;
      }

      let buildResult: any;
      try {
        const buildResponse = await apiRequest("POST", "/api/trade/build", {
          userWallet: connectedWallet,
          tokenMint: token.mint,
          amount: amountInBaseUnits,
          isBuy,
          slippageBps: 500,
        });
        buildResult = await buildResponse.json();
      } catch (err: any) {
        tx.error(friendlyError(err));
        return;
      }

      if (!buildResult?.success || !buildResult?.transaction) {
        // If the bonding curve is closed because the token graduated and we
        // have a Raydium pool, give the user a one-click escape hatch.
        if (buildResult?.graduated && buildResult?.raydiumPoolId) {
          tx.error(buildResult.error || "Trade on Raydium instead");
          toast(
            "This token migrated to Raydium. Open the pool to keep trading.",
            {
              action: {
                label: "Open Raydium",
                onClick: () => window.open(
                  `https://explorer.solana.com/address/${buildResult.raydiumPoolId}?cluster=devnet`,
                  "_blank",
                ),
              },
            },
          );
        } else {
          tx.error(buildResult?.error || "Failed to build transaction");
        }
        return;
      }

      const transactionBytes = Uint8Array.from(atob(buildResult.transaction), c => c.charCodeAt(0));

      tx.signing();

      const { Transaction } = await import("@solana/web3.js");
      const transaction = Transaction.from(transactionBytes);

      const signature = await signAndSendTransaction(transaction);

      tx.submitting();

      tx.success({
        signature,
        description: isBuy
          ? `Bought ${token.symbol} for ${tradeAmount} SOL`
          : `Sold ${tradeAmount} ${token.symbol}`,
      });

      // The on-chain trade already succeeded above (SOL has left the wallet).
      // Recording is idempotent server-side (deduped on signature), so we retry
      // with exponential backoff to make sure the trade shows up in the feed.
      const recordWithRetry = async (): Promise<any> => {
        const delays = [0, 800, 2000, 4500];
        let lastErr: any;
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
          try {
            const r = await apiRequest("POST", "/api/trade/record", {
              walletAddress: connectedWallet,
              tokenMint: token.mint,
              signature,
            });
            return await r.json();
          } catch (err) {
            lastErr = err;
            console.warn(`[Token] trade/record attempt ${i + 1} failed:`, err);
          }
        }
        throw lastErr;
      };

      try {
        const recordData = await recordWithRetry();
        if (recordData.pointsAwarded && Array.isArray(recordData.pointsAwarded)) {
          for (const p of recordData.pointsAwarded) {
            pointsAwarded(p.points, p.reason || "First trade");
          }
        }
      } catch (err) {
        console.error("[Token] Failed to record trade after retries:", err);
        // The on-chain trade succeeded but our server failed to log it.
        // Tell the user explicitly so they know the SOL movement is real.
        toast.warning("Trade landed on chain but feed update failed", {
          description: "Refresh the page in a moment - your balance is correct.",
          action: signature
            ? {
                label: "View tx",
                onClick: () =>
                  window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, "_blank"),
              }
            : undefined,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["token", mint] });
      queryClient.invalidateQueries({ queryKey: ["tokenActivity", mint] });
      queryClient.invalidateQueries({ queryKey: ["devnetBalance", connectedWallet] });

      setTradeAmount("");

    } catch (error: any) {
      console.error("Trade error:", error);
      tx.error(friendlyError(error));
    } finally {
      setIsTrading(false);
    }
  };

  const marketCapUsd = useMemo(() => {
    if (!token || !solPrice) return null;
    return token.marketCapSol * solPrice.price;
  }, [token, solPrice]);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className={`w-8 h-8 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
        </div>
      </Layout>
    );
  }

  if (error || !token) {
    const isNotFound = (error as any)?.message?.includes("404") || (error as any)?.message?.includes("not found");
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <p className={`font-mono text-lg font-bold ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>
            {isNotFound ? "Token not found" : "Failed to load token"}
          </p>
          <p className={`text-sm ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
            {isNotFound ? "This token may have been removed or the address is invalid." : "Something went wrong. Check your connection and try again."}
          </p>
          <div className="flex gap-3">
            {!isNotFound && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-bold rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Retry
              </button>
            )}
            <Link href="/tokens">
              <button className={`flex items-center gap-2 px-4 py-2 border-2 border-black rounded-lg font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${privateMode ? "text-[#4ADE80] bg-black" : "text-gray-700 bg-white hover:bg-gray-50"}`}>
                <ArrowLeft className="w-4 h-4" /> Back to tokens
              </button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const cardStyle = privateMode 
    ? "bg-black border-2 border-[#4ADE80]" 
    : "bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const inputStyle = privateMode
    ? "bg-black border-2 border-[#4ADE80]/50 text-[#4ADE80] focus:border-[#4ADE80]"
    : "bg-white border-2 border-black focus:ring-2 focus:ring-red-500";

  return (
    <Layout>
      <div className="space-y-4">
        {/* Back Button */}
        <Link href="/tokens">
          <button className={`flex items-center gap-2 text-sm ${privateMode ? "text-[#4ADE80]" : "text-gray-500 hover:text-gray-700"}`} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" /> Back to tokens
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Token Header */}
            <div className={`${cardStyle} p-4`}>
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${privateMode ? "border-[#4ADE80]/30 bg-black" : "border-black bg-gray-100"}`}>
                  {token.imageUri ? (
                    <img src={token.imageUri} alt={`${token.name} (${token.symbol}) token logo`} loading="lazy" className={`w-full h-full object-cover ${privateMode ? "opacity-80 sepia brightness-90 saturate-150 hue-rotate-60" : ""}`} />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-black text-xl ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`}>
                      {token.symbol[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-black text-xl ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>{token.name}</span>
                    <span className={`text-sm font-mono px-2 py-0.5 rounded ${privateMode ? "bg-black text-[#4ADE80]/70 border border-[#4ADE80]/30" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                      ${token.symbol}
                    </span>
                    <button onClick={handleCopyAddress} className={`text-xs flex items-center gap-1 ${privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80]" : "text-gray-400 hover:text-gray-600"}`}>
                      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {token.mint.slice(0, 6)}...
                    </button>
                    <button 
                      onClick={async () => {
                        hapticFeedback('light');
                        const baseUrl = window.location.origin?.startsWith('http') ? window.location.origin : 'https://dum.fun';
                        const shared = await shareContent({
                          title: `${token.name} ($${token.symbol}) on Dum.fun`,
                          text: `Check out $${token.symbol} on Dum.fun - ${token.description?.slice(0, 100) || 'A meme token on Solana'}`,
                          url: `${baseUrl}/token/${token.mint}`
                        });
                        if (shared) toast.success("Shared!");
                        else toast.success("Link copied!");
                      }}
                      className={`text-xs flex items-center gap-1 p-1.5 rounded ${privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80] hover:bg-[#4ADE80]/10" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                      data-testid="button-share-token"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                    <a
                      href={`https://solscan.io/account/${token.creatorAddress}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="flex items-center gap-1 hover:underline cursor-pointer" data-testid="text-creator-name">
                        by {creatorSns?.domain ?? `${token.creatorAddress.slice(0, 6)}...`}
                        {creatorSns?.domain && (
                          <span title="SNS verified .sol name" className="inline-flex">
                            <BadgeCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          </span>
                        )}
                      </span>
                    </a>
                    <span>{getTimeAgo(new Date(token.createdAt))} ago</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const tw = safeHttpUrl(token.twitter);
                        return tw && <a href={tw} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700"><Twitter className="w-3.5 h-3.5" /></a>;
                      })()}
                      {(() => {
                        const tg = safeHttpUrl(token.telegram);
                        return tg && <a href={tg} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700"><MessageCircle className="w-3.5 h-3.5" /></a>;
                      })()}
                      {(() => {
                        const ws = safeHttpUrl(token.website);
                        return ws && <a href={ws} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700"><Globe className="w-3.5 h-3.5" /></a>;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
                    {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                  </div>
                  <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                    {token.isGraduated ? "Graduated" : `${token.bondingCurveProgress.toFixed(1)}% bonded`}
                  </div>
                </div>
              </div>

              {/* Viral X share strip: prominent one-tap presets so users
                  can broadcast a discovery, an ape, or a chart-hype post
                  to X in a single click. Each preset opens a pre-filled
                  intent in a new tab. */}
              {(() => {
                const baseUrl = typeof window !== "undefined" && window.location.origin?.startsWith("http")
                  ? window.location.origin
                  : "https://dum.fun";
                const tokenUrl = `${baseUrl}/token/${token.mint}`;
                const mcStr = formatMarketCap(token.marketCapSol, solPrice?.price || null);
                const progressStr = token.isGraduated
                  ? "graduated to Raydium"
                  : `${token.bondingCurveProgress.toFixed(1)}% bonded`;
                const presets: Array<{ id: string; emoji: string; label: string; text: string }> = [
                  {
                    id: "discover",
                    emoji: "👀",
                    label: "I found a gem",
                    text: `👀 Just found $${token.symbol} on @dumdotfun\n\n${token.name} - ${mcStr} MC, ${progressStr}\n\nape responsibly`,
                  },
                  {
                    id: "ape",
                    emoji: "🚀",
                    label: "Aping in",
                    text: `🚀 Aping $${token.symbol} on @dumdotfun\n\nDevnet meme season is real\n${mcStr} MC and climbing`,
                  },
                  {
                    id: "chart",
                    emoji: "📈",
                    label: "Chart hype",
                    text: `📈 $${token.symbol} chart is cooking on @dumdotfun\n\n${mcStr} MC | ${progressStr}\n\nwho else is in?`,
                  },
                  {
                    id: "rug",
                    emoji: "🎯",
                    label: "Bet it rugs",
                    text: `🎯 New prediction market on @dumdotfun: will $${token.symbol} rug?\n\nPlace your bet on devnet\n${mcStr} MC right now`,
                  },
                ];
                return (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className={`flex items-center px-1 text-[10px] font-black uppercase tracking-wide ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                        Share on X
                      </div>
                      {presets.map(p => (
                        <a
                          key={p.id}
                          href={buildTwitterIntent(p.text, tokenUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => hapticFeedback("light")}
                          data-testid={`button-share-x-${p.id}`}
                          className={`group flex items-center gap-1 px-2 py-1 rounded border-2 font-bold text-[11px] whitespace-nowrap transition-all
                            ${privateMode
                              ? "bg-black border-[#4ADE80]/40 text-[#4ADE80] hover:border-[#4ADE80] hover:bg-[#4ADE80]/10"
                              : "bg-black border-black text-white hover:bg-gray-800"}`}
                        >
                          <span>{p.emoji}</span>
                          <span>{p.label}</span>
                          <svg className="w-2.5 h-2.5 opacity-80 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.844l-5.36-7.01L4.6 22H1.34l8.02-9.17L1 2h7.02l4.84 6.4L18.244 2zm-1.2 18h1.86L7.06 4H5.1l11.944 16z" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* TradingView Chart */}
            <div className="rounded-lg overflow-hidden">
              <TradingChart
                mint={mint!}
                solPrice={solPrice?.price || null}
                tokenSymbol={token.symbol}
                totalSupply={token.totalSupply || 1_000_000_000}
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Price", value: formatPrice(token.priceInSol * (solPrice?.price || (window as any).lastSolPrice || 200)) },
                { label: "MCap", value: formatMarketCap(token.marketCapSol, solPrice?.price || null) },
                { label: "Holders", value: "-" },
                { label: "Txns", value: tokenActivity?.length || 0 },
              ].map(({ label, value }) => (
                <div key={label} className={`${cardStyle} p-3 text-center`}>
                  <div className={`text-xs ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>{label}</div>
                  <div className={`font-mono text-sm font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Trades */}
            <div className={`${cardStyle} p-4`}>
              <div className={`font-bold mb-3 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>Recent Trades</div>
              {tokenActivity && tokenActivity.length > 0 ? (
                <>
                  {/* Mobile card list — shown only below sm */}
                  <div className="flex flex-col gap-2 sm:hidden">
                    {tokenActivity.slice(0, 8).map((activity) => {
                      const isBuy = activity.side === "buy" || activity.activityType === "buy";
                      const amount = activity.amount ? parseFloat(activity.amount) : 0;

                      let blockTime: number | null = null;
                      let signature: string | null = null;
                      try {
                        if (activity.metadata) {
                          const meta = JSON.parse(activity.metadata);
                          if (meta.blockTime) blockTime = meta.blockTime;
                          if (meta.signature) signature = meta.signature;
                        }
                      } catch (err) {
                        console.debug("[Token] Failed to parse activity metadata:", err);
                      }

                      const displayTime = blockTime
                        ? getTimeAgo(new Date(blockTime * 1000))
                        : getTimeAgo(new Date(activity.createdAt));

                      const amountLabel = isBuy ? (
                        <>
                          <span className="font-semibold">{amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                          <span className={`ml-1 text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>SOL</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">
                            {amount >= 1_000_000
                              ? `${(amount / 1_000_000).toFixed(2)}M`
                              : amount >= 1_000
                                ? `${(amount / 1_000).toFixed(2)}K`
                                : amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className={`ml-1 text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>{token.symbol}</span>
                        </>
                      );

                      const cardContent = (
                        <div
                          className={`flex items-center gap-3 px-3 py-3 rounded border ${
                            privateMode
                              ? "border-[#4ADE80]/20 bg-black/30 active:bg-[#4ADE80]/10"
                              : "border-gray-200 bg-gray-50 active:bg-gray-100"
                          } ${signature ? "cursor-pointer" : ""}`}
                          data-testid={`card-trade-${activity.id}`}
                        >
                          <img
                            src={defaultAvatar}
                            alt={`Trader ${activity.walletAddress?.slice(0, 6)}`}
                            className="w-9 h-9 rounded-full border border-gray-300 flex-shrink-0"
                            loading="lazy"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono truncate ${privateMode ? "text-white" : "text-gray-700"}`}>
                                <WalletName address={activity.walletAddress} truncate={6} showBadge={false} monoFallback={false} testId={`text-trader-mobile-${activity.id}`} />
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${isBuy ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`} data-testid={`badge-type-${activity.id}`}>
                                {isBuy ? "BUY" : "SELL"}
                              </span>
                            </div>
                            <div className={`text-sm mt-0.5 ${privateMode ? "text-white" : "text-gray-900"}`}>{amountLabel}</div>
                          </div>
                          <div className={`text-xs flex-shrink-0 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`} data-testid={`text-time-mobile-${activity.id}`}>
                            {displayTime}
                          </div>
                        </div>
                      );

                      return signature ? (
                        <a
                          key={activity.id}
                          href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-trade-solscan-mobile-${activity.id}`}
                        >
                          {cardContent}
                        </a>
                      ) : (
                        <div key={activity.id}>{cardContent}</div>
                      );
                    })}
                  </div>

                  {/* Desktop table — hidden below sm */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-xs border-b-2 ${privateMode ? "text-[#4ADE80]/70 border-[#4ADE80]/30" : "text-gray-500 border-gray-200"}`}>
                          <th className="text-left py-2">Account</th>
                          <th className="text-left py-2">Type</th>
                          <th className="text-right py-2">Amount</th>
                          <th className="text-right py-2">Time</th>
                          <th className="text-right py-2">Txn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tokenActivity.slice(0, 8).map((activity) => {
                          const isBuy = activity.side === "buy" || activity.activityType === "buy";
                          const amount = activity.amount ? parseFloat(activity.amount) : 0;

                          let blockTime: number | null = null;
                          let signature: string | null = null;
                          try {
                            if (activity.metadata) {
                              const meta = JSON.parse(activity.metadata);
                              if (meta.blockTime) blockTime = meta.blockTime;
                              if (meta.signature) signature = meta.signature;
                            }
                          } catch (err) {
                            console.debug("[Token] Failed to parse activity metadata:", err);
                          }

                          const displayTime = blockTime
                            ? getTimeAgo(new Date(blockTime * 1000))
                            : getTimeAgo(new Date(activity.createdAt));

                          return (
                            <tr key={activity.id} className={`border-b ${privateMode ? "border-[#4ADE80]/20" : "border-gray-100"}`}>
                              <td className={`py-2 ${privateMode ? "text-white" : "text-gray-600"}`}>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`https://solscan.io/account/${activity.walletAddress}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`link-trader-solscan-${activity.id}`}
                                  >
                                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                                      <img src={defaultAvatar} alt={`Trader ${activity.walletAddress?.slice(0, 6)}`} className="w-6 h-6 rounded-full border border-gray-300" loading="lazy" />
                                      <span className="hover:underline"><WalletName address={activity.walletAddress} truncate={6} showBadge={false} monoFallback={false} testId={`text-trader-${activity.id}`} /></span>
                                    </div>
                                  </a>
                                  {activity.walletAddress ? (
                                    <Link href={`/wallet/${activity.walletAddress}`}>
                                      <button
                                        title="View on-chain activity (mainnet, powered by Dune Sim)"
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider transition-colors ${
                                          privateMode
                                            ? "border-[#4ADE80]/40 text-[#4ADE80] hover:bg-[#4ADE80]/10"
                                            : "border-gray-300 text-gray-500 hover:bg-black hover:text-white hover:border-black"
                                        }`}
                                        data-testid={`button-onchain-${activity.id}`}
                                      >
                                        On-chain
                                      </button>
                                    </Link>
                                  ) : null}
                                </div>
                              </td>
                              <td className={`py-2 font-bold ${isBuy ? "text-green-500" : "text-red-500"}`}>{isBuy ? "Buy" : "Sell"}</td>
                              <td className={`py-2 text-right ${privateMode ? "text-white" : "text-gray-900"}`}>
                                {isBuy ? (
                                  <span>
                                    <span className="font-semibold">{amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                    <span className={`ml-1 text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>SOL</span>
                                    {solPrice?.price ? (
                                      <span className={`ml-1 text-xs ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                                        (${(amount * solPrice.price).toLocaleString(undefined, { maximumFractionDigits: 2 })})
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span>
                                    <span className="font-semibold">
                                      {amount >= 1_000_000
                                        ? `${(amount / 1_000_000).toFixed(2)}M`
                                        : amount >= 1_000
                                          ? `${(amount / 1_000).toFixed(2)}K`
                                          : amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className={`ml-1 text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>{token.symbol}</span>
                                  </span>
                                )}
                              </td>
                              <td className={`py-2 text-right ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>{displayTime}</td>
                              <td className="py-2 text-right">
                                {signature ? (
                                  <a
                                    href={`https://solscan.io/tx/${signature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-xs ${privateMode ? "text-[#4ADE80] hover:underline" : "text-blue-500 hover:underline"}`}
                                  >
                                    {signature.slice(0, 6)}...
                                  </a>
                                ) : (
                                  <span className={`text-xs ${privateMode ? "text-[#4ADE80]/30" : "text-gray-300"}`}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className={`text-center py-6 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>No trades yet</div>
              )}
            </div>

            {/* Predictions */}
            <div className={`${cardStyle} p-4 ${privateMode ? "border-yellow-500" : "border-yellow-500"}`} style={{ boxShadow: privateMode ? "none" : "4px 4px 0px 0px rgba(234,179,8,1)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-2 font-bold ${privateMode ? "text-yellow-400" : "text-yellow-700"}`}>
                    <Target className="w-4 h-4" /> Prediction Markets
                    {token.predictions && token.predictions.length > 0 && (
                      <span className={`text-xs font-normal px-1.5 py-0.5 rounded ${privateMode ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"}`}>
                        {token.predictions.length}
                      </span>
                    )}
                  </div>
                  <Link href={`/create-market?token=${token.mint}&name=${encodeURIComponent(token.name)}`}>
                    <button className={`text-xs px-2 py-1 font-bold border ${privateMode ? "bg-black border-yellow-500 text-yellow-400" : "bg-yellow-500 border-black text-black"}`} data-testid="button-create-market">
                      <Plus className="w-3 h-3 inline" /> Create
                    </button>
                  </Link>
                </div>

                {(!token.predictions || token.predictions.length === 0) && (
                  <p className={`text-sm text-center py-3 ${privateMode ? "text-zinc-500" : "text-gray-400"}`}>
                    No prediction markets yet. Be the first to create one!
                  </p>
                )}
                {token.predictions && token.predictions.length > 0 && (() => {
                  const sorted = [...token.predictions].sort((a, b) => {
                    const aOpen = a.status === "open";
                    const bOpen = b.status === "open";
                    if (aOpen && !bOpen) return -1;
                    if (!aOpen && bOpen) return 1;
                    return 0;
                  });
                  const openMarkets = sorted.filter(p => p.status === "open");
                  const closedMarkets = sorted.filter(p => p.status !== "open");
                  return (
                    <>
                      {openMarkets.map((prediction) => {
                        const isBettingActive = activeBet?.predictionId === prediction.id;
                        const isCreatorBlocked =
                          !!connectedWallet &&
                          connectedWallet === token.creatorAddress &&
                          !!prediction.survivalCriteria &&
                          DEV_BEHAVIOR_CRITERIA.includes(prediction.survivalCriteria);
                        return (
                          <div key={prediction.id} className={`p-3 mb-2 border-2 ${privateMode ? "bg-black border-green-500/40" : "bg-green-50 border-green-400 rounded"}`} data-testid={`prediction-${prediction.id}`}>
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-green-500 text-white uppercase tracking-wide" data-testid={`status-${prediction.id}`}>LIVE</span>
                                <span className={`text-sm font-medium truncate ${privateMode ? "text-white" : "text-gray-900"}`}>{prediction.question}</span>
                              </div>
                              <a
                                href={`/market/${prediction.id}`}
                                className={`shrink-0 text-xs px-2 py-1 rounded font-bold ${privateMode ? "bg-yellow-500 text-black hover:bg-yellow-400" : "bg-blue-500 text-white hover:bg-blue-600"}`}
                                data-testid={`link-market-${prediction.id}`}
                              >
                                VIEW
                              </a>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={(e) => handleBetClick(prediction.id, "yes", e)} disabled={isCreatorBlocked} title={isCreatorBlocked ? "Devs can't bet on their own dev-behavior market" : undefined} className={`py-2 font-bold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isBettingActive && activeBet?.side === "yes" ? "bg-green-500 text-white border-green-500" : privateMode ? "bg-black border-green-500/50 text-green-400" : "bg-green-100 border-green-500 text-green-700"}`} data-testid={`button-bet-yes-${prediction.id}`}>
                                <span className="block font-bold">{predictionHasConsensus(prediction) ? `${prediction.yesOdds}%` : "—"}</span>
                                <span className="text-xs">YES</span>
                              </button>
                              <button onClick={(e) => handleBetClick(prediction.id, "no", e)} disabled={isCreatorBlocked} title={isCreatorBlocked ? "Devs can't bet on their own dev-behavior market" : undefined} className={`py-2 font-bold border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isBettingActive && activeBet?.side === "no" ? "bg-red-500 text-white border-red-500" : privateMode ? "bg-black border-red-500/50 text-red-400" : "bg-red-100 border-red-500 text-red-700"}`} data-testid={`button-bet-no-${prediction.id}`}>
                                <span className="block font-bold">{predictionHasConsensus(prediction) ? `${prediction.noOdds}%` : "—"}</span>
                                <span className="text-xs">NO</span>
                              </button>
                            </div>
                            <div className={`mt-2 flex items-center justify-between text-[11px] ${privateMode ? "text-[#4ADE80]/60" : "text-gray-600"}`} data-testid={`meta-${prediction.id}`}>
                              <span>
                                <span className="font-bold">{(prediction.totalVolume || 0).toFixed(2)}</span> SOL pool
                              </span>
                              <span>{formatTimeLeft(prediction.resolutionDate)}</span>
                            </div>
                            {isCreatorBlocked && (
                              <p className={`mt-1 text-[10px] font-bold ${privateMode ? "text-amber-400/80" : "text-amber-700"}`} data-testid={`hint-dev-blocked-${prediction.id}`}>
                                Devs can't bet on their own dev-behavior market
                              </p>
                            )}
                            {!isCreatorBlocked && !predictionHasConsensus(prediction) && (
                              <p className={`mt-1 text-[10px] font-bold ${privateMode ? "text-yellow-400/80" : "text-yellow-600"}`}>
                                No consensus yet — be first to set the line
                              </p>
                            )}
                            {isBettingActive && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-1">
                                <div className="flex gap-2">
                                  <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder={`Min ${MIN_BET_SOL} SOL`} step="0.01" min={MIN_BET_SOL} className={`flex-1 px-3 py-2 text-sm ${inputStyle}`} onClick={(e) => e.stopPropagation()} data-testid={`input-bet-amount-${prediction.id}`} />
                                  <button onClick={handlePlaceBet} disabled={placeBetMutation.isPending || !betAmount || parseFloat(betAmount) < MIN_BET_SOL} className={`px-4 py-2 font-bold text-sm border-2 disabled:opacity-50 disabled:cursor-not-allowed ${privateMode ? "bg-[#4ADE80] border-[#4ADE80]" : activeBet?.side === "yes" ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600"} text-white flex items-center gap-1`} data-testid={`button-confirm-bet-${prediction.id}`}>
                                    {placeBetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : privateMode ? <><Lock className="w-3 h-3" /> PRIVATE</> : "BET"}
                                  </button>
                                </div>
                                <p className={`text-[10px] ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                                  Minimum bet: {MIN_BET_SOL} SOL
                                </p>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                      {closedMarkets.length > 0 && (
                        <>
                          {openMarkets.length > 0 && (
                            <div className={`flex items-center gap-2 my-2 ${privateMode ? "text-zinc-600" : "text-gray-400"}`}>
                              <div className="flex-1 h-px bg-current opacity-30" />
                              <span className="text-xs font-bold uppercase tracking-wider opacity-60">Closed</span>
                              <div className="flex-1 h-px bg-current opacity-30" />
                            </div>
                          )}
                          {closedMarkets.map((prediction) => (
                            <div key={prediction.id} className={`p-3 mb-2 border opacity-70 ${privateMode ? "bg-zinc-900 border-zinc-700 rounded" : "bg-gray-50 border-gray-300 rounded"}`} data-testid={`prediction-${prediction.id}`}>
                              <div className="flex items-start justify-between mb-2 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${prediction.status === "resolved" ? "bg-purple-500 text-white" : "bg-gray-400 text-white"}`} data-testid={`status-${prediction.id}`}>
                                    {prediction.status === "resolved" ? "RESOLVED" : "CLOSED"}
                                  </span>
                                  <span className={`text-sm font-medium truncate ${privateMode ? "text-zinc-400" : "text-gray-500"}`}>{prediction.question}</span>
                                </div>
                                <a
                                  href={`/market/${prediction.id}`}
                                  className={`shrink-0 text-xs px-2 py-1 rounded font-bold ${privateMode ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                                  data-testid={`link-market-${prediction.id}`}
                                >
                                  VIEW
                                </a>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className={`py-2 text-center border ${privateMode ? "border-zinc-700 text-zinc-500" : "border-gray-200 text-gray-400"} rounded`}>
                                  <span className="block font-bold text-sm">{prediction.yesOdds}%</span>
                                  <span className="text-xs">YES</span>
                                </div>
                                <div className={`py-2 text-center border ${privateMode ? "border-zinc-700 text-zinc-500" : "border-gray-200 text-gray-400"} rounded`}>
                                  <span className="block font-bold text-sm">{prediction.noOdds}%</span>
                                  <span className="text-xs">NO</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
          </div>

          {/* Right Column - Trade Panel */}
          <div className="space-y-4">
            {/* Graduation Banner */}
            {graduationStatus?.isGraduated && (
              <div className={`${cardStyle} p-4`} data-testid="graduation-banner">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎓</span>
                  <span className={`font-bold text-sm ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                    Token Graduated!
                  </span>
                </div>
                {graduationStatus.graduationStatus === "completed" && graduationStatus.raydiumPoolId ? (
                  <div className="space-y-2">
                    <p className={`text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-600"}`}>
                      This token has been migrated to a Raydium CPMM pool. View the on-chain pool below.
                    </p>
                    <a
                      href={`https://explorer.solana.com/address/${graduationStatus.raydiumPoolId}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 w-full justify-center py-2 font-bold border-2 text-sm transition-all ${
                        privateMode
                          ? "bg-[#4ADE80] text-black border-[#4ADE80] hover:bg-[#4ADE80]/80"
                          : "bg-purple-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      }`}
                      data-testid="link-raydium-pool"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Raydium Pool
                    </a>
                    {graduationStatus.graduationTx && (
                      <a
                        href={`https://explorer.solana.com/tx/${graduationStatus.graduationTx}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs underline ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}
                        data-testid="link-graduation-tx"
                      >
                        View graduation transaction
                      </a>
                    )}
                  </div>
                ) : graduationStatus.graduationStatus === "migrating" ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className={`w-4 h-4 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-purple-500"}`} />
                    <p className={`text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-600"}`}>
                      Migrating liquidity to Raydium...
                    </p>
                  </div>
                ) : graduationStatus.graduationStatus === "failed" ? (
                  <p className={`text-xs ${privateMode ? "text-red-400" : "text-red-500"}`}>
                    Migration failed. An admin can retry.
                  </p>
                ) : (
                  <p className={`text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-600"}`}>
                    Awaiting migration to Raydium DEX...
                  </p>
                )}
              </div>
            )}

            {/* Buy/Sell Panel - Graduated tokens swap on Raydium directly */}
            {token.isGraduated ? (
              <RaydiumSwapPanel
                mint={token.mint}
                tokenSymbol={token.symbol}
                tokenDecimals={6}
                raydiumPoolId={graduationStatus?.raydiumPoolId || undefined}
                connectedWallet={connectedWallet}
                signAndSendTransaction={signAndSendTransaction}
                ensureSession={async () => { await ensureSession(); }}
                connectWallet={connectWallet}
                privateMode={privateMode}
                cardStyle={cardStyle}
                inputStyle={inputStyle}
                solBalance={solBalance}
                tokenBalance={tokenBalance}
              />
            ) : (
            <div className={`${cardStyle} p-4 sticky top-4`}>
              {/* Buy/Sell Toggle - pump.fun style pill */}
              <div
                className={`relative flex p-1 mb-4 rounded-lg ${
                  privateMode ? "bg-black border border-[#4ADE80]/30" : "bg-gray-100 border border-gray-200"
                }`}
                data-testid="toggle-trade-type"
              >
                <button
                  onClick={() => setTradeType("buy")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all duration-150 ${
                    tradeType === "buy"
                      ? privateMode
                        ? "bg-[#4ADE80] text-black shadow-sm"
                        : "bg-[#22c55e] text-white shadow-sm"
                      : privateMode
                      ? "text-[#4ADE80]/60 hover:text-[#4ADE80]"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  data-testid="button-tab-buy"
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all duration-150 ${
                    tradeType === "sell"
                      ? "bg-[#ef4444] text-white shadow-sm"
                      : privateMode
                      ? "text-[#4ADE80]/60 hover:text-[#4ADE80]"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  data-testid="button-tab-sell"
                >
                  Sell
                </button>
              </div>

              {/* Token Balance Display for Sell */}
              {tradeType === "sell" && connectedWallet && (
                <div className={`flex items-center justify-between text-xs mb-2 px-1 ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                  <span>Your Balance:</span>
                  <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                    {tokenBalance?.balance ? tokenBalance.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"} {token.symbol}
                  </span>
                </div>
              )}

              {/* Amount Input */}
              <div className="relative mb-3">
                <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)} placeholder="0.00" className={`w-full px-4 py-3 text-lg font-mono ${inputStyle}`} />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>{tradeType === "buy" ? "SOL" : token.symbol}</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {tradeType === "buy" ? (
                  ["0.1", "0.5", "1", "Max"].map((amt) => (
                    <button key={amt} onClick={() => {
                      if (amt === "Max") {
                        // Use wallet SOL balance, leaving a small buffer for fees
                        const bal = solBalance ?? 0;
                        const usable = Math.max(0, bal - 0.01);
                        setTradeAmount(usable.toFixed(4));
                      } else {
                        setTradeAmount(amt);
                      }
                    }} className={`text-xs py-2 font-bold rounded-md transition-all ${privateMode ? "bg-black border border-[#4ADE80]/30 text-[#4ADE80]/70 hover:border-[#4ADE80] hover:bg-[#4ADE80]/10" : "bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-400"}`}>
                      {amt === "Max" ? amt : `${amt}`}
                    </button>
                  ))
                ) : (
                  ["25%", "50%", "75%", "Max"].map((pct) => (
                    <button key={pct} onClick={() => {
                      const balance = tokenBalance?.balance || 0;
                      if (pct === "Max") {
                        setTradeAmount(balance.toString());
                      } else {
                        const percent = parseInt(pct) / 100;
                        setTradeAmount((balance * percent).toFixed(2));
                      }
                    }} className={`text-xs py-2 font-bold rounded-md transition-all ${privateMode ? "bg-black border border-[#4ADE80]/30 text-[#4ADE80]/70 hover:border-[#4ADE80] hover:bg-[#4ADE80]/10" : "bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-400"}`}>
                      {pct}
                    </button>
                  ))
                )}
              </div>

              {/* Quote Display */}
              <AnimatePresence>
                {tradeQuote && tradeAmount && parseFloat(tradeAmount) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-3 mb-4 rounded border-2 font-mono text-xs space-y-1 ${privateMode ? "border-[#4ADE80]/30 bg-[#4ADE80]/5" : "border-black/5 bg-gray-50"}`}
                  >
                    <div className="flex justify-between">
                      <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>You receive:</span>
                      <span className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-black"}`}>
                        {tradeType === "buy" 
                          ? `${(parseFloat(tradeQuote.amountOut) / 1e6).toLocaleString()} ${token.symbol}`
                          : `${(parseFloat(tradeQuote.amountOut) / 1e9).toFixed(4)} SOL`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}>Price Impact:</span>
                      <span className={(tradeQuote.priceImpact || 0) > 5 ? "text-red-500" : (privateMode ? "text-[#4ADE80]" : "text-green-600")}>
                        {(tradeQuote.priceImpact || 0).toFixed(2)}%
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button - pump.fun style large pill */}
              {!connectedWallet ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => connectWallet()}
                  className={`w-full font-bold py-3.5 rounded-lg text-sm transition-all ${
                    privateMode
                      ? "bg-[#4ADE80] text-black hover:bg-[#3bc46e]"
                      : "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                  }`}
                  data-testid="button-connect-wallet"
                >
                  Connect Wallet
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleTrade}
                  disabled={!tradeAmount || Number(tradeAmount) <= 0 || isQuoting || isTrading}
                  className={`w-full font-bold py-3.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    tradeType === "buy"
                      ? privateMode
                        ? "bg-[#4ADE80] text-black hover:bg-[#3bc46e]"
                        : "bg-[#22c55e] text-white hover:bg-[#16a34a]"
                      : "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                  }`}
                  data-testid="button-trade"
                >
                  {isTrading ? "Confirming..." : isQuoting ? "Quoting..." : `Place ${tradeType === "buy" ? "buy" : "sell"} order`}
                </motion.button>
              )}
            </div>
            )}

            {/* Bonding Curve Progress (hidden once graduated; Token Graduated card above shows the Raydium link) */}
            {!token.isGraduated && (
              <div className={`${cardStyle} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>Bonding Curve</span>
                  <span className={`font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>{token?.bondingCurveProgress ? token.bondingCurveProgress.toFixed(1) : "0.0"}%</span>
                </div>
                <div className={`h-3 rounded-full overflow-hidden border ${privateMode ? "bg-black border-[#4ADE80]/30" : "bg-gray-200 border-gray-300"}`}>
                  <div className={`h-full transition-all ${privateMode ? "bg-[#4ADE80]" : (token?.bondingCurveProgress || 0) > 80 ? "bg-green-500" : (token?.bondingCurveProgress || 0) > 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(token?.bondingCurveProgress || 0, 100)}%` }} />
                </div>
                <div className={`flex justify-between text-xs mt-2 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                  <span>{token?.curveData?.realSolReserves ? (token.curveData.realSolReserves / 1e9).toFixed(2) : "0.00"} SOL</span>
                  <span>85 SOL to graduate</span>
                </div>
              </div>
            )}

            {/* Description */}
            {token.description && (
              <div className={`${cardStyle} p-4`}>
                <div className={`text-sm font-bold mb-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>About</div>
                <p className={`text-sm ${privateMode ? "text-[#4ADE80]/70" : "text-gray-600"}`}>{token.description}</p>
              </div>
            )}

            {/* Links */}
            <div className={`${cardStyle} p-4`}>
              <a href={`https://solscan.io/token/${token.mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between text-sm py-2 border-b ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80] border-[#4ADE80]/20" : "text-gray-500 hover:text-gray-700 border-gray-200"}`}>
                <span>View on Solscan</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <a href={`https://birdeye.so/token/${token.mint}?chain=solana`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between text-sm py-2 ${privateMode ? "text-[#4ADE80]/70 hover:text-[#4ADE80]" : "text-gray-500 hover:text-gray-700"}`}>
                <span>View on Birdeye</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Token Holders */}
            <TokenHoldersCard tokenMint={token.mint} compact />

            {/* Umbra Privacy Shield was the legacy token-page flow; private
                payouts are now handled per-winner on the market page via the
                ReceiverClaimableUTXO + browser-claim flow. */}
          </div>
        </div>
      </div>
    </Layout>
  );
}
