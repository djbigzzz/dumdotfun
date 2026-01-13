import { Layout } from "@/components/layout";
import { TokenCard } from "@/components/token-card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Loader2, AlertCircle, Rocket, Search, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePrivacy } from "@/lib/privacy-context";

interface TokenPrediction {
  id: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  status: string;
}

interface Token {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  predictions?: TokenPrediction[];
}

export default function TokensPage() {
  const { privateMode } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const waitlistMutation = useMutation({
    mutationFn: async (emailAddress: string) => {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join waitlist");
      }
      return res.json();
    },
    onSuccess: () => {
      setWaitlistJoined(true);
      setEmail("");
      toast.success("You're on the waitlist!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      waitlistMutation.mutate(email.trim());
    }
  };

  const { data: tokens, isLoading, error } = useQuery<Token[]>({
    queryKey: ["tokens"],
    queryFn: async () => {
      const res = await fetch("/api/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const filteredTokens = tokens?.filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Layout>
      <div className="space-y-6">
        {!waitlistJoined && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-red-500 to-pink-500 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-white" />
                <div>
                  <h3 className="font-black text-white">Join the Waitlist</h3>
                  <p className="text-white/80 text-sm">Be first to know when we launch on mainnet!</p>
                </div>
              </div>
              <form onSubmit={handleWaitlist} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="px-4 py-2 bg-white border-2 border-black rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium w-48 md:w-64"
                  data-testid="input-waitlist-email"
                />
                <motion.button
                  type="submit"
                  disabled={waitlistMutation.isPending || !email.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-lg border-2 border-black hover:bg-yellow-300 disabled:opacity-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="button-join-waitlist"
                >
                  {waitlistMutation.isPending ? "..." : "Join"}
                </motion.button>
              </form>
            </div>
          </motion.div>
        )}

        {waitlistJoined && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-400 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-black" />
              <div>
                <h3 className="font-black text-black">You're on the list!</h3>
                <p className="text-black/70 text-sm">We'll notify you when we launch on mainnet.</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-black ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-900"}`}>
              {privateMode ? "> TOKEN_FEED" : "Token Feed"}
            </h1>
            <p className={`mt-1 ${privateMode ? "text-[#39FF14]/70 font-mono" : "text-gray-500"}`}>
              {privateMode ? "// SCANNING_FOR_ALPHA" : "Browse tokens and bet on predictions"}
            </p>
          </div>
          
          <Link href="/create">
            <motion.button
              whileHover={{ y: -2, x: -2 }}
              whileTap={{ y: 0, x: 0 }}
              className={`flex items-center gap-2 font-bold px-6 py-3 border-2 rounded-lg transition-all ${
                privateMode 
                  ? "bg-black border-[#39FF14] text-[#39FF14] hover:shadow-[0_0_15px_rgba(57,255,20,0.3)] font-mono" 
                  : "bg-red-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              }`}
              data-testid="button-create-token"
            >
              <Plus className="w-5 h-5" />
              {privateMode ? "INITIALIZE_LAUNCH" : "Launch Token"}
            </motion.button>
          </Link>
        </div>

        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={privateMode ? "> SEARCH_TOKENS..." : "Search tokens..."}
            className={`w-full pl-12 pr-4 py-3 border-2 font-mono focus:outline-none transition-all ${
              privateMode 
                ? "bg-black border-[#39FF14]/30 text-[#39FF14] placeholder-[#39FF14]/30 focus:border-[#39FF14] focus:shadow-[0_0_10px_rgba(57,255,20,0.2)]" 
                : "bg-white border-black rounded-lg focus:ring-2 focus:ring-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            }`}
            data-testid="input-search-tokens"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-500">Failed to load tokens</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Rocket className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {searchQuery ? "No tokens found" : "No tokens yet"}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md">
              {searchQuery 
                ? "Try a different search term" 
                : "Be the first to launch a token on dum.fun!"}
            </p>
            {!searchQuery && (
              <Link href="/create">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="bg-red-500 text-white font-bold px-6 py-3 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  Launch First Token
                </motion.button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTokens.map((token) => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
