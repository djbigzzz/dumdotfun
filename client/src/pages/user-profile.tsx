import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { usePrivacy } from "@/lib/privacy-context";
import { motion } from "framer-motion";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { ExternalLink, Copy, Check, Coins, Calendar, ArrowLeft } from "lucide-react";
import defaultAvatar from "@assets/generated_images/derpy_blob_meme_mascot.png";

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(0)}`;
  return `${mcSol.toFixed(2)} SOL`;
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

interface UserProfile {
  walletAddress: string;
  createdAt: string | null;
  tokensCreated: UserToken[];
  followerCount: number;
  followingCount: number;
}

export default function UserProfilePage() {
  const { privateMode } = usePrivacy();
  const { wallet } = useParams<{ wallet: string }>();
  const [copied, setCopied] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile", wallet],
    queryFn: async () => {
      const res = await fetch(`/api/users/profile/${wallet}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!wallet,
  });

  const { data: solPrice } = useQuery<SolPrice>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/sol-price");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const copyWallet = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardStyle = privateMode 
    ? "bg-zinc-900/50 border-2 border-[#39FF14]/30" 
    : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <p className={`font-mono font-bold ${privateMode ? "text-[#39FF14]" : "text-gray-600"}`}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 max-w-4xl mx-auto">
        <Link href="/tokens">
          <button className={`flex items-center gap-2 mb-6 font-bold ${privateMode ? "text-[#39FF14]" : "text-gray-600 hover:text-black"}`}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>

        <div className="flex items-center gap-6 mb-8">
          <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${privateMode ? "border-[#39FF14]" : "border-black"}`}>
            <img src={defaultAvatar} alt="User avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className={`text-2xl font-black font-mono ${privateMode ? "text-white" : "text-gray-900"}`}>
              {wallet?.slice(0, 6)}...{wallet?.slice(-4)}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={copyWallet}
                className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border ${
                  privateMode 
                    ? "border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/10" 
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
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
                    ? "border-[#39FF14]/30 text-[#39FF14] hover:bg-[#39FF14]/10" 
                    : "border-gray-300 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <ExternalLink className="w-3 h-3" /> Solscan
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
              {profile?.followerCount || 0}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
              Followers
            </div>
          </div>
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
              {profile?.followingCount || 0}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
              Following
            </div>
          </div>
          <div className={`${cardStyle} p-4 text-center rounded-lg`}>
            <div className={`text-3xl font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
              {profile?.tokensCreated?.length || 0}
            </div>
            <div className={`text-xs font-bold uppercase ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>
              Coins Created
            </div>
          </div>
        </div>

        <div className={`${cardStyle} p-6 rounded-lg`}>
          <div className="flex items-center gap-2 mb-4">
            <Coins className={`w-5 h-5 ${privateMode ? "text-[#39FF14]" : "text-red-500"}`} />
            <h2 className={`text-lg font-black uppercase ${privateMode ? "text-[#39FF14]" : "text-gray-900"}`}>
              Created Coins
            </h2>
          </div>

          {profile?.tokensCreated && profile.tokensCreated.length > 0 ? (
            <div className="space-y-3">
              {profile.tokensCreated.map((token) => (
                <Link key={token.mint} href={`/token/${token.mint}`}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer ${
                      privateMode 
                        ? "border-[#39FF14]/20 hover:border-[#39FF14]/50 bg-black/50" 
                        : "border-gray-200 hover:border-black bg-gray-50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg overflow-hidden border ${privateMode ? "border-[#39FF14]/30" : "border-gray-300"}`}>
                      {token.imageUri ? (
                        <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center font-black ${privateMode ? "bg-black text-[#39FF14]" : "bg-gray-200 text-gray-500"}`}>
                          {token.symbol[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-black ${privateMode ? "text-white" : "text-gray-900"}`}>{token.name}</div>
                      <div className={`text-xs font-mono ${privateMode ? "text-[#39FF14]/70" : "text-gray-500"}`}>${token.symbol}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${privateMode ? "text-[#39FF14]" : "text-green-600"}`}>
                        {formatMarketCap(token.marketCapSol, solPrice?.price || null)}
                      </div>
                      <div className={`text-xs ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`}>Market Cap</div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={`text-center py-8 ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`}>
              No coins created yet
            </div>
          )}
        </div>

        {profile?.createdAt && (
          <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`}>
            <Calendar className="w-4 h-4" />
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </Layout>
  );
}
