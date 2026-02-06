import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Flame, TrendingUp, Loader2, Zap } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

interface Token {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
}

interface SolPrice {
  price: number;
  currency: string;
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

function formatMarketCap(mcSol: number, solPrice: number | null): string {
  const usdValue = solPrice ? mcSol * solPrice : null;
  if (usdValue && usdValue >= 1000000) return `$${(usdValue / 1000000).toFixed(2)}M`;
  if (usdValue && usdValue >= 1000) return `$${(usdValue / 1000).toFixed(1)}K`;
  if (usdValue) return `$${usdValue.toFixed(2)}`;
  return "$0.00";
}

export default function TrendingPage() {
  const { privateMode } = usePrivacy();

  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const { data: solPrice } = useQuery<SolPrice>({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const topByMarketCap = [...(tokens || [])]
    .sort((a, b) => b.marketCapSol - a.marketCapSol)
    .slice(0, 10);

  const topByProgress = [...(tokens || [])]
    .sort((a, b) => b.bondingCurveProgress - a.bondingCurveProgress)
    .slice(0, 10);

  const newest = [...(tokens || [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const graduated = (tokens || []).filter(t => t.isGraduated);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 data-testid="text-trending-title" className={`text-2xl font-black flex items-center gap-2 ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-900"}`}>
            <Flame className={`w-6 h-6 ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} />
            {privateMode ? "> TRENDING" : "Trending"}
          </h1>
          <p className={`mt-1 text-sm ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
            {privateMode ? "// hottest tokens right now" : "The hottest tokens right now"}
          </p>
        </div>

        <TrendingSection
          title={privateMode ? "> TOP_MCAP" : "Top Market Cap"}
          icon={<TrendingUp className="w-5 h-5" />}
          tokens={topByMarketCap}
          solPrice={solPrice?.price || null}
          privateMode={privateMode}
          testId="section-top-mcap"
        />

        <TrendingSection
          title={privateMode ? "> MOVERS" : "Biggest Movers"}
          icon={<Zap className="w-5 h-5" />}
          tokens={topByProgress}
          solPrice={solPrice?.price || null}
          privateMode={privateMode}
          showProgress
          testId="section-movers"
        />

        <TrendingSection
          title={privateMode ? "> JUST_LAUNCHED" : "Just Launched"}
          icon={<Flame className="w-5 h-5" />}
          tokens={newest}
          solPrice={solPrice?.price || null}
          privateMode={privateMode}
          testId="section-new"
        />

        {graduated.length > 0 && (
          <TrendingSection
            title={privateMode ? "> GRADUATED" : "Graduated"}
            icon={<span className="text-lg">🎓</span>}
            tokens={graduated}
            solPrice={solPrice?.price || null}
            privateMode={privateMode}
            testId="section-graduated"
          />
        )}
      </div>
    </Layout>
  );
}

function TrendingSection({ title, icon, tokens, solPrice, privateMode, showProgress, testId }: {
  title: string;
  icon: React.ReactNode;
  tokens: Token[];
  solPrice: number | null;
  privateMode: boolean;
  showProgress?: boolean;
  testId: string;
}) {
  if (tokens.length === 0) return null;

  return (
    <div data-testid={testId}>
      <h2 className={`text-lg font-black flex items-center gap-2 mb-3 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
        {icon}
        {title}
      </h2>
      <div className="space-y-2">
        {tokens.map((token, index) => (
          <Link key={token.mint} href={`/token/${token.mint}`}>
            <motion.div
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                privateMode
                  ? "bg-black border border-[#4ADE80]/30 hover:border-[#4ADE80]"
                  : "bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              }`}
              data-testid={`trending-row-${token.mint}`}
            >
              <span className={`text-sm font-bold w-6 text-center ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}>
                {index + 1}
              </span>

              <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border ${privateMode ? "border-[#4ADE80]/30" : "border-black"}`}>
                {token.imageUri ? (
                  <img src={token.imageUri} alt={token.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-black text-sm ${privateMode ? "bg-black text-[#4ADE80]" : "bg-red-500 text-white"}`}>
                    {token.symbol[0]}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-sm truncate ${privateMode ? "text-white" : "text-gray-900"}`}>
                    {token.name}
                  </span>
                  <span className={`text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                    ${token.symbol}
                  </span>
                </div>
                {showProgress && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${privateMode ? "bg-[#4ADE80]/20" : "bg-gray-200"}`}>
                      <div
                        className={`h-full rounded-full ${privateMode ? "bg-[#4ADE80]" : "bg-red-500"}`}
                        style={{ width: `${Math.min(token.bondingCurveProgress, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-500"}`}>
                      {token.bondingCurveProgress.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-bold ${privateMode ? "text-white" : "text-gray-900"}`}>
                  {formatMarketCap(token.marketCapSol, solPrice)}
                </div>
                <div className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
                  {getTimeAgo(new Date(token.createdAt))} ago
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
