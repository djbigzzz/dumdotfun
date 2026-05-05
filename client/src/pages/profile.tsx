import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { apiRequest } from "@/lib/queryClient";
import { CloakShieldButton } from "@/components/cloak-shield-button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";

import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, Wallet, Gift, Share2, Trophy, Star, Flame, Shield, Diamond, Target, TrendingUp, Coins, Loader2, RefreshCw, ArrowDownLeft, X, Pencil, ChevronRight, Sparkles, LogOut, Twitter } from "lucide-react";
import { Connection, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { toast } from "sonner";
import { txToast, friendlyError } from "@/lib/notify";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

interface PointsData {
  totalPoints: number;
  tier: string;
  tierLabel: string;
  nextTier: { name: string; label: string; minPoints: number } | null;
  ogNftMint: string | null;
  hasOgCard: boolean;
  ogBoost: string;
  lastDailyLogin: string | null;
  streak: number;
  dailyCheckedIn: boolean;
  completedQuests: string[];
  questDefinitions: { completed: boolean; repeatable: boolean }[];
  history: { action: string; points: number; createdAt: string; referralSource: string | null }[];
  rank: number;
}

interface UserToken {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  marketCapSol: number;
  priceInSol: number;
}

interface HeldToken {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  balance: number;
  priceInSol: number | null;
  valueInSol: number | null;
  marketCapSol: number | null;
  isDumFun: boolean;
  isOnBondingCurve?: boolean;
}

interface HoldingsResponse {
  solBalance: number;
  holdings: HeldToken[];
}

interface UserProfileData {
  walletAddress: string;
  createdAt: string | null;
  tokensCreated: UserToken[];
  followerCount: number;
  followingCount: number;
}

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(0)}`;
  return `${mcSol.toFixed(3)} SOL`;
}

function formatBalance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string; border: string }> = {
  pill_popper: { label: "Fresh Pill", color: "#EC4899", icon: <Star className="w-5 h-5" />, bg: "bg-pink-500/20", border: "border-pink-500" },
  bonding_curve: { label: "Curve Rider", color: "#3B82F6", icon: <TrendingUp className="w-5 h-5" />, bg: "bg-blue-500/20", border: "border-blue-500" },
  degen: { label: "Full Degen", color: "#EAB308", icon: <Flame className="w-5 h-5" />, bg: "bg-yellow-500/20", border: "border-yellow-500" },
  rug_proof: { label: "Diamond Hands", color: "#22C55E", icon: <Shield className="w-5 h-5" />, bg: "bg-green-500/20", border: "border-green-500" },
  solana_god: { label: "On-Chain God", color: "#06B6D4", icon: <Diamond className="w-5 h-5" />, bg: "bg-cyan-500/20", border: "border-cyan-400" },
};

type TabType = "holdings" | "bets" | "coins";

interface BetPosition {
  id: string;
  marketId: string;
  side: "yes" | "no";
  amount: number;
  shares: number;
  isConfidential: boolean;
  createdAt: string;
  market: {
    id: string;
    question: string;
    imageUri: string | null;
    tokenMint: string | null;
    survivalCriteria?: string;
    resolutionDate: string;
    status: string;
    outcome: string | null;
    yesOdds: number;
    noOdds: number;
    yesPool: number;
    noPool: number;
  };
  payout: number | null;
  won: boolean | null;
  isExpired: boolean;
}

interface BetsResponse {
  active: BetPosition[];
  resolved: BetPosition[];
  totalStaked: number;
  totalWon: number;
}

export default function Profile() {
  usePageTitle("/profile");
  const privateMode = false;
  const { connectedWallet, disconnectWallet, connectWallet, ensureSession, signTransaction } = useWallet();
  const [, setLocation] = useLocation();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("holdings");
  const queryClient = useQueryClient();
  const [sellToken, setSellToken] = useState<HeldToken | null>(null);
  const [sellPct, setSellPct] = useState(100);
  const [maxSafePct, setMaxSafePct] = useState<number>(100);
  const [curveLoading, setCurveLoading] = useState(false);

  useEffect(() => {
    if (!sellToken) { setMaxSafePct(100); return; }
    let cancelled = false;
    setCurveLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/bonding-curve/curve/${sellToken.mint}`);
        if (!r.ok) { if (!cancelled) { setMaxSafePct(100); setCurveLoading(false); } return; }
        const d = await r.json();
        const realSol = Number(d.realSolReserves) || 0;
        const vSol = Number(d.virtualSolReserves) || 0;
        const vTok = Number(d.virtualTokenReserves) || 0;
        if (!realSol || !vSol || !vTok || !sellToken.balance) {
          if (!cancelled) { setMaxSafePct(100); setCurveLoading(false); }
          return;
        }
        // 5% safety margin so the deployed program never hits the boundary
        const maxSolOut = realSol * 0.95;
        const k = vSol * vTok;
        const denom = vSol - maxSolOut;
        let maxTokensInRaw = Number.MAX_SAFE_INTEGER;
        if (denom > 0) maxTokensInRaw = (k / denom) - vTok;
        // Convert raw token units (with decimals) to UI tokens. balance is already in UI units.
        const decimals = 6; // bonding curve mints use 6 decimals
        const maxTokensInUi = maxTokensInRaw / Math.pow(10, decimals);
        const pct = Math.max(1, Math.min(100, Math.floor((maxTokensInUi / sellToken.balance) * 100)));
        if (!cancelled) {
          setMaxSafePct(pct);
          setSellPct((prev) => Math.min(prev, pct));
          setCurveLoading(false);
        }
      } catch {
        if (!cancelled) { setMaxSafePct(100); setCurveLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [sellToken]);
  const [isSelling, setIsSelling] = useState(false);

  const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

  const handleSell = async () => {
    if (!sellToken || !connectedWallet) return;
    setIsSelling(true);
    const tx = txToast("sell", `${sellPct}% of ${sellToken.symbol || sellToken.name}`);
    try {
      const tokenAmount = (sellToken.balance * sellPct) / 100;
      await ensureSession();
      const res = await apiRequest("POST", "/api/bonding-curve/sell", {
        seller: connectedWallet, mint: sellToken.mint, tokenAmount: tokenAmount.toString(), minSolOut: "0",
      });

      const { transaction: txBase64 } = await res.json();
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      tx.signing();
      const signedTx = await signTransaction(transaction);

      tx.submitting();
      const connection = new Connection(SOLANA_RPC, "confirmed");
      let sig: string;
      try {
        sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
        const conf = await connection.confirmTransaction(sig, "confirmed");
        if (conf.value?.err) {
          throw new Error(`Sell failed on chain: ${JSON.stringify(conf.value.err)}`);
        }
      } catch (err: any) {
        if (err.message?.includes("already been processed")) {
          const sigBytes = signedTx.signatures[0]?.signature;
          if (!sigBytes) throw err;
          const bs58 = (await import("bs58")).default;
          sig = bs58.encode(sigBytes);
        } else { throw err; }
      }

      tx.success({
        signature: sig,
        description: `Sold ${sellPct}% of ${sellToken.symbol || sellToken.name} - SOL returned to wallet`,
      });

      // Record the sell so it appears in the token's Recent Trades feed.
      // Server is idempotent on signature, so retry on transient failure.
      const tokenAmountStr = ((sellToken.balance * sellPct) / 100).toString();
      const recordSell = async () => {
        const delays = [0, 800, 2000, 4500];
        let lastErr: any;
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
          try {
            await apiRequest("POST", "/api/trade/record", {
              walletAddress: connectedWallet,
              tokenMint: sellToken.mint,
              signature: sig,
            });
            return;
          } catch (e) {
            lastErr = e;
            console.warn(`[Profile] sell record attempt ${i + 1} failed:`, e);
          }
        }
        throw lastErr;
      };
      recordSell().catch((err) => {
        console.error("[Profile] Failed to record sell after retries:", err);
        toast.warning("Sell landed on chain but feed update failed", {
          description: "Refresh in a moment - your balance is correct.",
        });
      });

      setSellToken(null);
      queryClient.invalidateQueries({ queryKey: ["my-holdings", connectedWallet] });
      queryClient.invalidateQueries({ queryKey: ["tokenActivity", sellToken.mint] });
    } catch (err: any) {
      tx.error(friendlyError(err));
    } finally {
      setIsSelling(false);
    }
  };

  // No redirect — handled below by showing a connect-wallet prompt

  const copyWallet = () => {
    if (connectedWallet) {
      navigator.clipboard.writeText(connectedWallet);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const { data: displayNameData, refetch: refetchDisplayName } = useQuery<{ displayName: string | null }>({
    queryKey: ["displayName", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/${connectedWallet}/display-name`);
      return res.json();
    },
    enabled: !!connectedWallet,
  });
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setNameDraft(displayNameData?.displayName || "");
  }, [displayNameData?.displayName]);

  const saveDisplayName = async () => {
    if (!connectedWallet) return;
    setSavingName(true);
    try {
      await ensureSession();
      const res = await apiRequest("PATCH", `/api/users/${connectedWallet}/display-name`, {
        walletAddress: connectedWallet,
        displayName: nameDraft,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save name");
        return;
      }
      toast.success(data.displayName ? `Name set to ${data.displayName}` : "Name cleared");
      setEditingName(false);
      await refetchDisplayName();
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    } catch (e: any) {
      toast.error(e?.message || "Could not save name");
    } finally {
      setSavingName(false);
    }
  };

  const copyReferralLink = () => {
    if (user?.referralCode) {
      const link = `https://dum.fun?ref=${user.referralCode}`;
      navigator.clipboard.writeText(link);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    }
  };

  const { data: user, isLoading } = useQuery<UserWithReferrals | null>({
    queryKey: ["user", connectedWallet],
    queryFn: async () => {
      if (!connectedWallet) return null;
      const res = await fetch(`/api/users/wallet/${connectedWallet}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!connectedWallet,
  });

  const { data: pointsData } = useQuery<PointsData>({
    queryKey: ["points", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/points/${connectedWallet}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!connectedWallet,
    refetchInterval: 30000,
  });

  const { data: myCoinsData, isLoading: myCoinsLoading } = useQuery<UserProfileData>({
    queryKey: ["my-coins", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/profile/${connectedWallet}`);
      if (!res.ok) throw new Error("Failed to fetch coins");
      return res.json();
    },
    enabled: !!connectedWallet && activeTab === "coins",
  });

  const { data: holdingsData, isLoading: holdingsLoading, isFetching: holdingsFetching, refetch: refetchHoldings } = useQuery<HoldingsResponse>({
    queryKey: ["my-holdings", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/holdings/${connectedWallet}`);
      if (!res.ok) throw new Error("Failed to fetch holdings");
      return res.json();
    },
    enabled: !!connectedWallet && activeTab === "holdings",
  });

  const { data: betsData, isLoading: betsLoading } = useQuery<BetsResponse>({
    queryKey: ["my-bets", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/positions/wallet/${connectedWallet}/with-markets`);
      if (!res.ok) throw new Error("Failed to fetch bets");
      return res.json();
    },
    enabled: !!connectedWallet && activeTab === "bets",
    refetchInterval: 30000,
  });

  // Always fetch a lightweight count so the tab badge stays accurate
  const { data: betsBadge } = useQuery<BetsResponse>({
    queryKey: ["my-bets-badge", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/positions/wallet/${connectedWallet}/with-markets`);
      if (!res.ok) throw new Error("Failed to fetch bets");
      return res.json();
    },
    enabled: !!connectedWallet,
    staleTime: 60000,
  });

  const { data: solPrice } = useQuery<{ price: number; currency: string }>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: activeTab === "coins" || activeTab === "holdings",
  });

  const { data: walletBalance } = useQuery<{ address: string; balance: number; network: string }>({
    queryKey: ["devnetBalance", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/devnet/balance/${connectedWallet}`);
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    enabled: !!connectedWallet,
    refetchInterval: 30000,
  });

  const ogClaimMutation = useMutation({
    mutationFn: async () => {
      await ensureSession();
      const res = await apiRequest("POST", "/api/points/claim-og", { walletAddress: connectedWallet });
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "OG Card activated!");
      queryClient.invalidateQueries({ queryKey: ["points", connectedWallet] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to activate OG Card");
    },
  });

  const handleLogout = async () => {
    await disconnectWallet();
    setLocation("/");
  };

  if (!connectedWallet) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-5 text-center px-4">
          <div className="text-5xl">👤</div>
          <div>
            <p className="text-xl font-black text-gray-900 mb-1">Your Profile</p>
            <p className="text-gray-500">Connect your wallet to view your profile, points, and holdings.</p>
          </div>
          <button
            onClick={() => connectWallet()}
            className="px-8 py-3 bg-red-500 text-white font-black text-lg rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            data-testid="button-connect-wallet-profile"
          >
            Connect Wallet
          </button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-gray-600 font-mono font-bold">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className="text-gray-600 font-mono font-bold">User not found</p>
        </div>
      </Layout>
    );
  }

  const tier = TIER_CONFIG[pointsData?.tier || "pill_popper"] || TIER_CONFIG.pill_popper;
  const totalPoints = pointsData?.totalPoints || 0;
  const streak = pointsData?.streak || 0;
  const hasOg = !!pointsData?.hasOgCard;
  const progressToNext = !pointsData?.nextTier ? 100 : Math.min(100, (totalPoints / pointsData.nextTier.minPoints) * 100);

  const cardStyle = privateMode
    ? "border-2 border-[#4ADE80]/50 bg-zinc-900/50 rounded-xl shadow-[4px_4px_0px_0px_rgba(74,222,128,0.3)]"
    : "border-2 border-black bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const quests = pointsData?.questDefinitions || [];
  const completedCount = quests.filter(q => q.completed).length;
  const totalQuests = quests.filter(q => !q.repeatable).length;

  const tabStyle = (tab: TabType) => {
    const isActive = activeTab === tab;
    if (privateMode) {
      return `px-4 py-2.5 font-bold text-sm uppercase rounded-lg border-2 transition-all cursor-pointer ${
        isActive
          ? "bg-[#4ADE80] text-black border-[#4ADE80] font-mono"
          : "bg-zinc-900 text-[#4ADE80]/60 border-[#4ADE80]/30 hover:border-[#4ADE80]/60 font-mono"
      }`;
    }
    return `px-4 py-2.5 font-bold text-sm uppercase rounded-lg border-2 border-black transition-all cursor-pointer ${
      isActive
        ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        : "bg-white text-black hover:bg-gray-100"
    }`;
  };

  return (
    <Layout>
      <div className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-6xl mx-auto px-4"
        >
          <div className="space-y-6">
            {/* Identity Header */}
            <div className={`${cardStyle} p-5 md:p-6`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  style={{ background: `linear-gradient(135deg, ${tier.color}, ${tier.color}99)` }}
                  data-testid="avatar-profile"
                >
                  <span className="text-3xl font-black text-white drop-shadow">
                    {(displayNameData?.displayName || user.walletAddress).slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 truncate" data-testid="text-profile-name">
                      {displayNameData?.displayName || `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}`}
                    </h1>
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1.5 rounded-md border border-gray-200 hover:border-black hover:bg-gray-50 text-gray-500 hover:text-black"
                      title="Edit display name"
                      data-testid="button-edit-name-header"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <a
                      href={`https://solscan.io/account/${user.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono hover:text-black hover:underline truncate"
                      data-testid="link-wallet-header"
                    >
                      {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-6)}
                    </a>
                    <button onClick={copyWallet} className="text-gray-400 hover:text-black flex-shrink-0" data-testid="button-copy-wallet">
                      {copiedWallet ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <span className="text-gray-300">·</span>
                    <span className="font-bold" style={{ color: tier.color }} data-testid="text-tier">{tier.label}</span>
                    {hasOg && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="font-bold text-purple-500 flex items-center gap-1">
                          <Diamond className="w-3 h-3" /> OG
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 font-bold text-xs uppercase rounded-lg border-2 border-black bg-white text-gray-700 hover:bg-red-500 hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors flex items-center gap-1.5 self-start md:self-auto"
                  data-testid="button-logout"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log out
                </button>
              </div>
            </div>

            {/* Stat Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`${cardStyle} p-4`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 mb-1">
                  <Sparkles className="w-3 h-3" /> Points
                </div>
                <div className="text-2xl font-black text-black" data-testid="text-total-points">{totalPoints.toLocaleString()}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Rank #{pointsData?.rank || "-"}</div>
              </div>
              <div className={`${cardStyle} p-4`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 mb-1">
                  <Wallet className="w-3 h-3" /> SOL
                </div>
                <div className="text-2xl font-black text-black" data-testid="text-sol-balance">
                  {walletBalance ? walletBalance.balance.toFixed(3) : "-"}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">Devnet balance</div>
              </div>
              <div className={`${cardStyle} p-4`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 mb-1">
                  <Flame className={`w-3 h-3 ${streak > 0 ? "text-orange-500" : ""}`} /> Streak
                </div>
                <div className="text-2xl font-black text-black" data-testid="text-streak">{streak}<span className="text-sm font-bold text-gray-400 ml-1">d</span></div>
                <div className="text-[11px] text-gray-500 mt-0.5">{pointsData?.dailyCheckedIn ? "Checked in today" : "Check in for points"}</div>
              </div>
              <div className={`${cardStyle} p-4`}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-gray-500 mb-1">
                  <Trophy className="w-3 h-3" /> Quests
                </div>
                <div className="text-2xl font-black text-black" data-testid="text-quest-progress">{completedCount}<span className="text-sm font-bold text-gray-400">/{totalQuests}</span></div>
                <Link href="/quests" className="text-[11px] text-red-500 font-bold hover:underline mt-0.5 inline-block">View all -&gt;</Link>
              </div>
            </div>

            {/* Tier progress */}
            {pointsData?.nextTier && (
              <div className={`${cardStyle} p-4`}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-bold text-gray-500">Progress to {pointsData.nextTier.label}</span>
                  <span className="font-mono font-bold text-black">{totalPoints} / {pointsData.nextTier.minPoints.toLocaleString()}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden border-2 border-black bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNext}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                </div>
              </div>
            )}

            {/* 2-column layout: main + settings rail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Tab nav */}
                <div className="flex gap-2" data-testid="profile-tabs">
                  <button onClick={() => setActiveTab("holdings")} className={tabStyle("holdings")} data-testid="tab-holdings">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" /> Holdings
                      {holdingsData && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeTab === "holdings" ? "bg-white text-black" : "bg-gray-200 text-gray-600"}`}>
                          {holdingsData.holdings.length + 1}
                        </span>
                      )}
                    </span>
                  </button>
                  <button onClick={() => setActiveTab("bets")} className={tabStyle("bets")} data-testid="tab-bets">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4" /> Bets
                      {((betsBadge?.active.length ?? 0) + (betsBadge?.resolved.length ?? 0)) > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeTab === "bets" ? "bg-white text-black" : "bg-gray-200 text-gray-600"}`}>
                          {(betsBadge?.active.length ?? 0) + (betsBadge?.resolved.length ?? 0)}
                        </span>
                      )}
                    </span>
                  </button>
                  <button onClick={() => setActiveTab("coins")} className={tabStyle("coins")} data-testid="tab-coins">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4" /> My Coins
                      {(myCoinsData?.tokensCreated?.length ?? 0) > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeTab === "coins" ? "bg-white text-black" : "bg-gray-200 text-gray-600"}`}>
                          {myCoinsData!.tokensCreated.length}
                        </span>
                      )}
                    </span>
                  </button>
                </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "coins" && (
                <motion.div
                  key="coins"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className={`${cardStyle} p-6`}>
                    {myCoinsLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-mono text-sm">Loading your coins…</span>
                      </div>
                    ) : myCoinsData?.tokensCreated && myCoinsData.tokensCreated.length > 0 ? (
                      <div className="space-y-3">
                        {myCoinsData.tokensCreated.map((token) => (
                          <Link key={token.mint} href={`/token/${token.mint}`}>
                            <motion.div
                              whileHover={{ x: 4 }}
                              className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer ${
                                privateMode
                                  ? "border-[#4ADE80]/20 hover:border-[#4ADE80]/50 bg-black/50"
                                  : "border-gray-200 hover:border-black bg-gray-50"
                              }`}
                              data-testid={`token-created-${token.mint}`}
                            >
                              <div className={`w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300"}`}>
                                {token.imageUri ? (
                                  <img src={token.imageUri} alt={`${token.name} token`} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                  <div className={`w-full h-full flex items-center justify-center font-black ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-200 text-gray-500"}`}>
                                    {token.symbol[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-black truncate ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                                <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>${token.symbol}</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                  {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                                </div>
                                <div className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>Market Cap</div>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-center py-8 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                        <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-bold">No coins created yet</p>
                        <Link href="/create">
                          <button className={`mt-3 px-4 py-2 font-bold text-sm border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${privateMode ? "bg-[#4ADE80] text-black" : "bg-red-500 text-white"}`}>
                            Launch a Token
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "holdings" && (
                <motion.div
                  key="holdings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className={`${cardStyle} p-6`}>
                    {holdingsLoading ? (
                      <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-mono text-sm">Fetching on-chain balances…</span>
                      </div>
                    ) : holdingsData ? (() => {
                      const totalSol = (holdingsData.solBalance ?? 0) + holdingsData.holdings.reduce((s, h) => s + (h.valueInSol ?? 0), 0);
                      const rowClass = `flex items-center gap-4 p-3 rounded-lg border cursor-pointer ${privateMode ? "border-[#4ADE80]/20 hover:border-[#4ADE80]/50 bg-black/50" : "border-gray-200 hover:border-black bg-gray-50"}`;
                      return (
                        <>
                          {/* Portfolio total bar */}
                          <div className={`flex items-center justify-between mb-4 pb-3 border-b ${privateMode ? "border-zinc-700" : "border-gray-200"}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/60" : "text-gray-400"}`}>Total portfolio value</span>
                              <button
                                onClick={() => refetchHoldings()}
                                disabled={holdingsFetching}
                                title="Refresh balances"
                                data-testid="button-refresh-holdings"
                                className={`p-1 rounded transition-colors ${privateMode ? "hover:bg-zinc-800 text-[#4ADE80]/50 hover:text-[#4ADE80]" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${holdingsFetching ? "animate-spin" : ""}`} />
                              </button>
                            </div>
                            <div className="text-right">
                              <span className={`font-black text-lg ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                {totalSol.toFixed(4)} SOL
                              </span>
                              {solPrice && (
                                <span className={`ml-2 text-sm ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                  ≈ ${(totalSol * solPrice.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* SOL row — always first */}
                            <a href={`https://solscan.io/account/${connectedWallet}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                              <motion.div whileHover={{ x: 4 }} className={rowClass} data-testid="token-sol">
                                <div className={`w-10 h-10 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center ${privateMode ? "border-[#4ADE80]/30 bg-zinc-900" : "border-gray-300 bg-gray-100"}`}>
                                  <img
                                    src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                                    alt="SOL"
                                    className="w-7 h-7 rounded-full"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`font-black ${privateMode ? "text-white" : "text-gray-900"}`}>Solana</div>
                                  <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                                    {(holdingsData.solBalance ?? 0).toFixed(4)} SOL · native
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                    {(holdingsData.solBalance ?? 0).toFixed(4)} SOL
                                  </div>
                                  {solPrice && (
                                    <div className={`text-xs ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                      ≈ ${((holdingsData.solBalance ?? 0) * solPrice.price).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </a>

                            {/* SPL tokens */}
                            {holdingsData.holdings.map((token) => {
                              const canSell = token.isOnBondingCurve;
                              const row = (
                                <motion.div
                                  whileHover={{ x: canSell ? 0 : 4 }}
                                  className={rowClass}
                                  data-testid={`token-held-${token.mint}`}
                                >
                                  <div className={`w-10 h-10 rounded-lg overflow-hidden border flex-shrink-0 ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300"}`}>
                                    {token.imageUri ? (
                                      <img src={token.imageUri} alt={token.name} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className={`w-full h-full flex items-center justify-center font-black text-sm ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-200 text-gray-500"}`}>
                                        {(token.symbol[0] || "?").toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-black truncate ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                                    <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                                      {formatBalance(token.balance)} ${token.symbol}
                                      {!token.isDumFun && !token.isOnBondingCurve && (
                                        <span className={`ml-1.5 ${privateMode ? "text-zinc-600" : "text-gray-300"}`}>· external</span>
                                      )}
                                      {token.isOnBondingCurve && !token.isDumFun && (
                                        <span className="ml-1.5 text-orange-400">· orphaned</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-right">
                                      {token.valueInSol !== null ? (
                                        <>
                                          <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                                            {token.valueInSol.toFixed(4)} SOL
                                          </div>
                                          {solPrice && (
                                            <div className={`text-xs ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                              ≈ ${(token.valueInSol * solPrice.price).toFixed(2)}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className={`text-xs italic ${privateMode ? "text-zinc-600" : "text-gray-300"}`}>no price</div>
                                      )}
                                    </div>
                                    {canSell && (
                                      <button
                                        data-testid={`button-sell-${token.mint}`}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSellToken(token); setSellPct(100); }}
                                        className="flex items-center gap-1 px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors flex-shrink-0"
                                      >
                                        <ArrowDownLeft className="w-3 h-3" />
                                        Sell
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                              return token.isDumFun ? (
                                <Link key={token.mint} href={`/token/${token.mint}`}>{row}</Link>
                              ) : token.isOnBondingCurve ? (
                                <div key={token.mint}>{row}</div>
                              ) : (
                                <a key={token.mint} href={`https://solscan.io/token/${token.mint}?cluster=devnet`} target="_blank" rel="noopener noreferrer">{row}</a>
                              );
                            })}
                          </div>
                        </>
                      );
                    })() : (
                      <div className={`text-center py-8 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                        <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-bold">Connect wallet to see holdings</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "bets" && (
                <motion.div
                  key="bets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                  data-testid="bets-tab-content"
                >
                  {betsLoading ? (
                    <div className={`${cardStyle} p-12 text-center`}>
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                      <p className="mt-3 text-sm text-gray-500">Loading your bets...</p>
                    </div>
                  ) : !betsData || (betsData.active.length === 0 && betsData.resolved.length === 0) ? (
                    <div className={`${cardStyle} p-12 text-center`}>
                      <Target className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <h3 className="font-black text-lg mb-1">No bets yet</h3>
                      <p className="text-sm text-gray-500 mb-4">Predict whether tokens survive or rug, win SOL when you're right.</p>
                      <Link href="/markets" className="inline-block px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-sm" data-testid="link-browse-markets">
                        Browse markets
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`${cardStyle} p-3 text-center`}>
                          <div className="text-[10px] uppercase font-bold text-gray-500">Active</div>
                          <div className="text-2xl font-black mt-1" data-testid="text-bets-active-count">{betsData.active.length}</div>
                        </div>
                        <div className={`${cardStyle} p-3 text-center`}>
                          <div className="text-[10px] uppercase font-bold text-gray-500">Staked</div>
                          <div className="text-2xl font-black mt-1" data-testid="text-bets-staked">{betsData.totalStaked.toFixed(2)}</div>
                          <div className="text-[10px] text-gray-500">SOL</div>
                        </div>
                        <div className={`${cardStyle} p-3 text-center`}>
                          <div className="text-[10px] uppercase font-bold text-gray-500">Won</div>
                          <div className="text-2xl font-black mt-1 text-green-600" data-testid="text-bets-won">{betsData.totalWon.toFixed(2)}</div>
                          <div className="text-[10px] text-gray-500">SOL</div>
                        </div>
                      </div>

                      {betsData.active.length > 0 && (
                        <div>
                          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                            Active Predictions ({betsData.active.length})
                          </h3>
                          <div className="space-y-2">
                            {betsData.active.map((p) => (
                              <Link key={p.id} href={`/market/${p.marketId}`} className={`${cardStyle} p-3 flex items-center gap-3 hover:border-red-500 transition-colors block`} data-testid={`bet-active-${p.id}`}>
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                                  {p.market.imageUri ? (
                                    <img src={p.market.imageUri} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Target className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate">{p.market.question}</div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    Resolves {new Date(p.market.resolutionDate).toLocaleDateString()}
                                    {p.isExpired && <span className="ml-1 text-amber-600 font-bold">- pending</span>}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${p.side === "yes" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {p.side.toUpperCase()}
                                  </span>
                                  <div className="text-xs font-mono font-bold mt-1">{p.amount.toFixed(3)} SOL</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {betsData.resolved.length > 0 && (
                        <div>
                          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                            Resolved ({betsData.resolved.length})
                          </h3>
                          <div className="space-y-2">
                            {betsData.resolved.map((p) => (
                              <Link key={p.id} href={`/market/${p.marketId}`} className={`${cardStyle} p-3 flex items-center gap-3 hover:border-red-500 transition-colors block opacity-90`} data-testid={`bet-resolved-${p.id}`}>
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                                  {p.market.imageUri ? (
                                    <img src={p.market.imageUri} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Target className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm truncate">{p.market.question}</div>
                                  <div className="text-[11px] text-gray-500 mt-0.5">
                                    Resolved {p.market.outcome?.toUpperCase()}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                                  {p.won ? (
                                    <>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-black bg-green-100 text-green-700">WON</span>
                                      <div className="text-xs font-mono font-bold text-green-600">+{(p.payout || 0).toFixed(3)} SOL</div>
                                      {connectedWallet && (p.payout || 0) > 0 && (
                                        <CloakShieldButton
                                          marketId={p.marketId}
                                          recipientWallet={connectedWallet}
                                          amountSol={Number((p.payout || 0).toFixed(6))}
                                        />
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-[10px] px-2 py-0.5 rounded font-black bg-gray-200 text-gray-600">LOST</span>
                                      <div className="text-xs font-mono font-bold text-gray-500">-{p.amount.toFixed(3)} SOL</div>
                                    </>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}
                </AnimatePresence>
              </div>

              {/* Settings rail */}
              <div className="space-y-4">
                {/* Display name editor */}
                {editingName && (
                  <div className={`${cardStyle} p-4 space-y-2`}>
                    <h3 className="text-xs font-bold uppercase text-gray-500">Display Name</h3>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="e.g. degen_alice"
                      maxLength={20}
                      autoFocus
                      className="w-full px-3 py-2 text-sm border-2 rounded border-black bg-white text-black font-mono"
                      data-testid="input-display-name"
                    />
                    <p className="text-[11px] text-gray-500">
                      2-20 chars. Letters, numbers, _ . - only.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={saveDisplayName}
                        disabled={savingName}
                        className="flex-1 py-2 text-xs font-bold border-2 bg-red-500 text-white border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                        data-testid="button-save-display-name"
                      >
                        {savingName ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameDraft(displayNameData?.displayName || ""); }}
                        className="px-3 py-2 text-xs font-bold border-2 bg-white border-black text-black"
                        data-testid="button-cancel-display-name"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Referral card */}
                <div className={`${cardStyle} p-4 space-y-3`}>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-pink-500" />
                    <h3 className="text-xs font-bold uppercase text-gray-500">Refer friends</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-2 py-1.5 border-2 border-black rounded text-[11px] font-mono truncate bg-gray-100 text-gray-700">
                      {user.referralCode ? `dum.fun?ref=${user.referralCode}` : "Generating..."}
                    </div>
                    <button
                      onClick={copyReferralLink}
                      disabled={!user.referralCode}
                      className="px-2 py-1.5 font-bold rounded border-2 border-black bg-pink-400 text-black disabled:opacity-50"
                      data-testid="button-copy-referral"
                    >
                      {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (!user.referralCode) return;
                      const url = `https://dum.fun?ref=${user.referralCode}`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Launch tokens, bet on devs, climb the leaderboard. Join me on Dum.fun for bonus points")}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!user.referralCode}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 font-bold rounded border-2 border-black bg-black text-white text-xs disabled:opacity-50"
                    data-testid="button-share-referral"
                  >
                    <Twitter className="w-3.5 h-3.5" /> Share on X
                  </button>
                  <p className="text-[11px] text-gray-500">
                    Earn 10% of your referrals' points. <span className="font-black text-black" data-testid="text-referral-count">{user.referralCount} referred</span>
                  </p>
                </div>

                {/* OG Card */}
                <div className={`${cardStyle} p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-purple-500" />
                    <h3 className="text-xs font-bold uppercase text-gray-500">OG Card</h3>
                  </div>
                  {hasOg ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border-2 border-purple-500 bg-purple-50">
                      <div className="flex items-center gap-2">
                        <Diamond className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="text-xs font-black text-black">Active</p>
                          <p className="text-[10px] text-purple-600">+20% points boost</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-purple-500" data-testid="text-og-boost-active">+20%</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Free, permanent 1.2x points boost.</p>
                      <button
                        onClick={() => ogClaimMutation.mutate()}
                        disabled={ogClaimMutation.isPending}
                        className="w-full px-3 py-2 font-bold text-xs uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-purple-500 text-white disabled:opacity-50"
                        data-testid="button-claim-og"
                      >
                        {ogClaimMutation.isPending ? "Claiming..." : "Claim OG Card"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick links */}
                <div className={`${cardStyle} p-4 space-y-1`}>
                  <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Shortcuts</h3>
                  <Link href="/quests" className="flex items-center justify-between py-1.5 text-sm font-bold text-black hover:text-red-500" data-testid="link-quests">
                    <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Quests</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                  <Link href="/leaderboard" className="flex items-center justify-between py-1.5 text-sm font-bold text-black hover:text-red-500" data-testid="link-leaderboard">
                    <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Leaderboard</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Sell Modal */}
      {sellToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSellToken(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Sell Tokens</h2>
              <button onClick={() => setSellToken(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                {sellToken.imageUri ? (
                  <img src={sellToken.imageUri} alt={sellToken.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-sm bg-gray-200 text-gray-500">
                    {(sellToken.symbol[0] || "?").toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="font-black text-gray-900">{sellToken.name}</div>
                <div className="text-xs text-gray-500 font-mono">{sellToken.mint.slice(0, 8)}…{sellToken.mint.slice(-6)}</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Amount to sell</span>
                <span className="font-bold text-gray-900">{sellPct}%</span>
              </div>
              <input
                type="range" min={1} max={maxSafePct} value={sellPct}
                onChange={(e) => setSellPct(Number(e.target.value))}
                className="w-full accent-red-500"
                data-testid="input-sell-percentage"
              />
              <div className="flex justify-between mt-2 gap-2">
                {[25, 50, 75, 100].map((pct) => {
                  const disabled = pct > maxSafePct;
                  return (
                    <button key={pct} onClick={() => !disabled && setSellPct(pct)} disabled={disabled}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        disabled ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" :
                        sellPct === pct ? "bg-red-500 text-white border-red-500" : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                      }`}>
                      {pct}%
                    </button>
                  );
                })}
              </div>
              {!curveLoading && maxSafePct < 100 && (
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 leading-snug" data-testid="text-sell-cap-notice">
                  Curve liquidity caps this sell at <span className="font-bold">{maxSafePct}%</span>. Sell what's available now, the rest as the curve fills up.
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Tokens to sell</span><span className="font-mono font-bold text-gray-900">{((sellToken.balance * sellPct) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
              {sellToken.valueInSol !== null && (
                <div className="flex justify-between text-gray-600 mt-1"><span>Est. return</span><span className="font-bold text-green-600">~{((sellToken.valueInSol * sellPct) / 100).toFixed(4)} SOL</span></div>
              )}
            </div>

            <button
              data-testid="button-confirm-sell"
              onClick={handleSell}
              disabled={isSelling}
              className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black text-base transition-colors flex items-center justify-center gap-2"
            >
              {isSelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Selling…</> : <><ArrowDownLeft className="w-4 h-4" /> Sell {sellPct}%</>}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
