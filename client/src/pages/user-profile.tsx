import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useSnsName } from "@/hooks/use-sns";

import { motion } from "framer-motion";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { ExternalLink, Copy, Check, Coins, Wallet, Calendar, ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import defaultAvatar from "@assets/generated_images/derpy_blob_meme_mascot.png";

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

interface SolPrice {
  price: number;
  currency: string;
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
  priceInSol: number;
  valueInSol: number;
  marketCapSol: number;
}

interface UserProfile {
  walletAddress: string;
  createdAt: string | null;
  tokensCreated: UserToken[];
  followerCount: number;
  followingCount: number;
}

export default function UserProfilePage() {
  const privateMode = false;
  const { wallet } = useParams<{ wallet: string }>();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"created" | "holdings">("created");

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile", wallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/profile/${wallet}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!wallet,
  });

  const { data: holdingsData, isLoading: holdingsLoading } = useQuery<{ holdings: HeldToken[] }>({
    queryKey: ["user-holdings", wallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/holdings/${wallet}`);
      if (!res.ok) throw new Error("Failed to fetch holdings");
      return res.json();
    },
    enabled: !!wallet,
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

  const { data: walletSns } = useSnsName(wallet);

  const copyWallet = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardStyle = privateMode
    ? "bg-zinc-900/50 border-2 border-[#4ADE80]/30"
    : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  const holdings = holdingsData?.holdings ?? [];
  const totalValueSol = holdings.reduce((sum, h) => sum + h.valueInSol, 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className={`font-mono font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-600"}`}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 max-w-4xl mx-auto">
        <Link href="/tokens">
          <button className={`flex items-center gap-2 mb-6 font-bold ${privateMode ? "text-[#4ADE80]" : "text-gray-600 hover:text-black"}`}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        {/* Avatar + Identity */}
        <div className="flex items-center gap-6 mb-8">
          <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${privateMode ? "border-[#4ADE80]" : "border-black"}`}>
            <img src={defaultAvatar} alt={`Profile avatar for wallet ${wallet?.slice(0, 6)}`} loading="lazy" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className={`text-2xl font-black font-mono ${privateMode ? "text-white" : "text-gray-900"}`} data-testid="text-profile-name">
                {walletSns?.domain ?? `${wallet?.slice(0, 6)}...${wallet?.slice(-4)}`}
              </h1>
              {walletSns?.domain && (
                <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" title="SNS verified .sol name" data-testid="badge-sns-verified" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={copyWallet}
                className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border ${
                  privateMode
                    ? "border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/10"
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
                data-testid="button-copy-wallet"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : wallet?.slice(0, 10) + "..."}
              </button>
              <a
                href={`https://solscan.io/account/${wallet}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border ${
                  privateMode
                    ? "border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/10"
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
                data-testid="link-solscan"
              >
                <ExternalLink className="w-3 h-3" /> Solscan
              </a>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-gray-900"}`} data-testid="stat-followers">
              {profile?.followerCount || 0}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>Followers</div>
          </div>
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-gray-900"}`} data-testid="stat-following">
              {profile?.followingCount || 0}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>Following</div>
          </div>
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-gray-900"}`} data-testid="stat-coins-created">
              {profile?.tokensCreated?.length || 0}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>Created</div>
          </div>
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-green-600"}`} data-testid="stat-portfolio-value">
              {holdingsLoading ? "…" : totalValueSol > 0 ? `${totalValueSol.toFixed(2)}◎` : "0◎"}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>Portfolio</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b-2 border-black">
          <button
            onClick={() => setActiveTab("created")}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm border-2 border-b-0 -mb-0.5 transition-colors ${
              activeTab === "created"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-500 border-gray-300 hover:border-gray-500"
            }`}
            data-testid="tab-created"
          >
            <Coins className="w-4 h-4" />
            Created
            {(profile?.tokensCreated?.length ?? 0) > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${activeTab === "created" ? "bg-white text-black" : "bg-gray-200 text-gray-600"}`}>
                {profile?.tokensCreated?.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("holdings")}
            className={`flex items-center gap-2 px-4 py-2 font-bold text-sm border-2 border-b-0 -mb-0.5 transition-colors ${
              activeTab === "holdings"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-500 border-gray-300 hover:border-gray-500"
            }`}
            data-testid="tab-holdings"
          >
            <Wallet className="w-4 h-4" />
            Holdings
            {holdings.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${activeTab === "holdings" ? "bg-white text-black" : "bg-gray-200 text-gray-600"}`}>
                {holdings.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className={`${cardStyle} p-6 rounded-lg`}>
          {activeTab === "created" && (
            <>
              {profile?.tokensCreated && profile.tokensCreated.length > 0 ? (
                <div className="space-y-3">
                  {profile.tokensCreated.map((token) => (
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
                        <div className={`w-10 h-10 rounded-lg overflow-hidden border ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300"}`}>
                          {token.imageUri ? (
                            <img src={token.imageUri} alt={`${token.name} token`} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-black ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-200 text-gray-500"}`}>
                              {token.symbol[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-black ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                          <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>${token.symbol}</div>
                        </div>
                        <div className="text-right">
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
                  No coins created yet
                </div>
              )}
            </>
          )}

          {activeTab === "holdings" && (
            <>
              {holdingsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-sm">Fetching on-chain balances…</span>
                </div>
              ) : holdings.length > 0 ? (
                <>
                  {/* Portfolio total bar */}
                  <div className={`flex items-center justify-between mb-4 pb-3 border-b ${privateMode ? "border-zinc-700" : "border-gray-200"}`}>
                    <span className={`text-xs font-bold uppercase ${privateMode ? "text-[#4ADE80]/60" : "text-gray-400"}`}>Total portfolio value</span>
                    <div className="text-right">
                      <span className={`font-black text-lg ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                        {totalValueSol.toFixed(4)} SOL
                      </span>
                      {solPrice && (
                        <span className={`ml-2 text-sm ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                          ≈ ${(totalValueSol * solPrice.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {holdings.map((token) => (
                      <Link key={token.mint} href={`/token/${token.mint}`}>
                        <motion.div
                          whileHover={{ x: 4 }}
                          className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer ${
                            privateMode
                              ? "border-[#4ADE80]/20 hover:border-[#4ADE80]/50 bg-black/50"
                              : "border-gray-200 hover:border-black bg-gray-50"
                          }`}
                          data-testid={`token-held-${token.mint}`}
                        >
                          <div className={`w-10 h-10 rounded-lg overflow-hidden border ${privateMode ? "border-[#4ADE80]/30" : "border-gray-300"}`}>
                            {token.imageUri ? (
                              <img src={token.imageUri} alt={`${token.name} token`} loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center font-black ${privateMode ? "bg-black text-[#4ADE80]" : "bg-gray-200 text-gray-500"}`}>
                                {token.symbol[0]}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`font-black ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                            <div className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                              {formatBalance(token.balance)} ${token.symbol}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`}>
                              {token.valueInSol.toFixed(4)} SOL
                            </div>
                            {solPrice && (
                              <div className={`text-xs ${privateMode ? "text-zinc-400" : "text-gray-400"}`}>
                                ≈ ${(token.valueInSol * solPrice.price).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className={`text-center py-8 ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                  No dum.fun tokens held
                </div>
              )}
            </>
          )}
        </div>

        {profile?.createdAt && (
          <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
            <Calendar className="w-4 h-4" />
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </Layout>
  );
}
