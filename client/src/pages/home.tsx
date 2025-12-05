import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Users, Gift, Rocket, Zap } from "lucide-react";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

export default function Home() {
  const { connectedWallet, connectWallet } = useWallet();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      localStorage.setItem("referralCode", ref);
    } else {
      const storedRef = localStorage.getItem("referralCode");
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, []);

  const { data: user } = useQuery<UserWithReferrals | null>({
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

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setSubmitStatus("success");
      setEmail("");
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const storedRef = localStorage.getItem("referralCode");
      await connectWallet(storedRef || undefined);
    } finally {
      setIsConnecting(false);
    }
  };

  const copyReferralLink = () => {
    if (user?.referralCode) {
      const link = `${window.location.origin}?ref=${user.referralCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-120px)] flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl text-center space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-block px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-full"
            >
              <span className="text-yellow-500 font-bold text-sm uppercase tracking-wider">
                Coming Soon
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
              DUM<span className="text-red-500">.</span>FUN
            </h1>

            <p className="text-xl text-gray-400 max-w-lg mx-auto">
              Launch tokens. Predict outcomes. Trade the chaos.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-red-500" />
                <span>Token Launchpad</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Prediction Markets</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-500" />
                <span>Referral Rewards</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-red-600/30 rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-bold text-white">Join the Waitlist</h2>

            {submitStatus === "success" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-green-900/20 border border-green-600/30 rounded-lg"
              >
                <p className="text-green-400 font-bold">You're on the list!</p>
                <p className="text-gray-400 text-sm mt-1">
                  We'll notify you when we launch.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleWaitlist} className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                    data-testid="input-email"
                  />
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !email.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="button-join-waitlist"
                  >
                    {isSubmitting ? "..." : "Join"}
                  </motion.button>
                </div>

                {submitStatus === "error" && (
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                )}
              </form>
            )}
          </div>

          <div className="border-t border-zinc-800 pt-8 space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-bold text-white">Referral Program</h3>
            </div>

            {!connectedWallet ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Connect your wallet to get your referral link and earn rewards for every friend you bring.
                </p>
                <motion.button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 bg-zinc-800 border border-zinc-700 text-white font-bold rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all disabled:opacity-50"
                  data-testid="button-connect-wallet"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </motion.button>
                {referralCode && (
                  <p className="text-xs text-gray-500">
                    Referred by: <span className="text-green-400 font-mono">{referralCode}</span>
                  </p>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-green-600/30 rounded-lg p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Your Referral Code</span>
                  <span className="text-xl font-mono font-bold text-green-400">
                    {user?.referralCode || "Loading..."}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 bg-zinc-800 rounded-lg text-sm font-mono text-gray-400 truncate">
                    {user?.referralCode 
                      ? `${window.location.origin}?ref=${user.referralCode}`
                      : "Loading..."
                    }
                  </div>
                  <motion.button
                    onClick={copyReferralLink}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!user?.referralCode}
                    className="px-4 py-3 bg-green-600 text-black font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    data-testid="button-copy-referral"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">
                      {user?.referralCount ?? 0}
                    </p>
                    <p className="text-xs text-gray-500 uppercase">Referrals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-yellow-500">???</p>
                    <p className="text-xs text-gray-500 uppercase">Rewards Coming</p>
                  </div>
                </div>

                {user?.referredBy && (
                  <p className="text-xs text-gray-500 pt-2 border-t border-zinc-800">
                    You were referred by: <span className="text-green-400 font-mono">{user.referredBy.slice(0, 8)}...</span>
                  </p>
                )}
              </motion.div>
            )}
          </div>

          <p className="text-xs text-gray-600">
            Early referrers will receive bonus rewards when we launch.
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}
