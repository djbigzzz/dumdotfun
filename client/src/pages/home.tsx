import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Users, Rocket, Zap, TrendingUp, Target, Clock, ChevronRight } from "lucide-react";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

const LAUNCH_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isLaunched, setIsLaunched] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = LAUNCH_DATE.getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsLaunched(true);
        return true;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
      return false;
    };

    if (calculateTimeLeft()) return;
    
    const timer = setInterval(() => {
      if (calculateTimeLeft()) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLaunched) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-4"
      >
        <span className="text-3xl md:text-5xl font-black text-green-500">
          WE ARE LIVE!
        </span>
      </motion.div>
    );
  }

  const TimeBlock = ({ value, label, color }: { value: number; label: string; color: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.1, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${color} border-2 border-black rounded-xl p-3 md:p-4 min-w-[65px] md:min-w-[85px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
      >
        <span className="text-3xl md:text-5xl font-black text-white font-mono drop-shadow-sm">
          {String(value).padStart(2, "0")}
        </span>
      </motion.div>
      <span className="text-xs md:text-sm font-black text-gray-400 mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex gap-2 md:gap-3 justify-center items-start">
      <TimeBlock value={timeLeft.days} label="Days" color="bg-red-500" />
      <div className="text-3xl md:text-5xl font-black text-pink-400 mt-3 md:mt-4">:</div>
      <TimeBlock value={timeLeft.hours} label="Hours" color="bg-red-400" />
      <div className="text-3xl md:text-5xl font-black text-pink-400 mt-3 md:mt-4">:</div>
      <TimeBlock value={timeLeft.minutes} label="Mins" color="bg-pink-400" />
      <div className="text-3xl md:text-5xl font-black text-pink-400 mt-3 md:mt-4">:</div>
      <TimeBlock value={timeLeft.seconds} label="Secs" color="bg-pink-300" />
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }: { 
  icon: typeof Rocket; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      className={`bg-zinc-900/80 backdrop-blur border border-${color}-600/30 rounded-xl p-6 space-y-3`}
    >
      <div className={`w-12 h-12 rounded-lg bg-${color}-900/50 border border-${color}-600/50 flex items-center justify-center`}>
        <Icon className={`w-6 h-6 text-${color}-500`} />
      </div>
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Home() {
  const { connectedWallet, connectWallet } = useWallet();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
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
      <div className="min-h-[calc(100vh-120px)] py-8 md:py-16">
        <div className="max-w-5xl mx-auto px-4 space-y-12">
          
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border-2 border-black rounded-full shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]"
            >
              <Clock className="w-4 h-4 text-red-500" />
              <span className="text-red-500 font-black text-sm uppercase tracking-wider">
                Launching Soon
              </span>
            </motion.div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">
              <span className="text-red-500">DUM</span>
              <span className="text-pink-400">.</span>
              <span className="text-pink-300">FUN</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed font-bold">
              Launch tokens. Bet on rugs.{" "}
              <span className="text-green-400">Make money either way.</span>
            </p>

            <p className="text-base text-gray-400 max-w-xl mx-auto">
              The only platform where you can launch your own meme coin{" "}
              <span className="text-red-500 font-bold">AND</span> bet that the dev will rug.{" "}
              Win-win, degen style.
            </p>

            {/* Countdown Timer */}
            <div className="py-8">
              <CountdownTimer />
            </div>
          </motion.section>

          {/* How It Works */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <h2 className="text-center text-2xl font-black text-white">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                whileHover={{ y: -3, x: -2 }}
                className="bg-red-500 border-2 border-black rounded-xl p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white border-2 border-black flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white">Launch Your Token</h3>
                    <p className="text-sm text-red-100/80">Create meme coins in seconds</p>
                  </div>
                </div>
                <ul className="space-y-2 text-white/90 text-sm font-medium">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-white" />
                    Pick a name, add an image, launch
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-white" />
                    Price goes up as people buy in
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-white" />
                    Hit the goal? Token goes to real trading
                  </li>
                </ul>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, x: -2 }}
                className="bg-pink-300 border-2 border-black rounded-xl p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white border-2 border-black flex items-center justify-center">
                    <Target className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-black">Bet on Everything</h3>
                    <p className="text-sm text-black/60">Make money on your predictions</p>
                  </div>
                </div>
                <ul className="space-y-2 text-black/80 text-sm font-medium">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-black" />
                    Think the dev will rug? Bet on it
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-black" />
                    Token gonna moon? Bet on it
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-black" />
                    You're right? You get paid
                  </li>
                </ul>
              </motion.div>
            </div>

            <motion.div
              whileHover={{ y: -2 }}
              className="bg-green-400 border-2 border-black rounded-xl p-5 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-black" />
                <h3 className="text-lg font-black text-black">The Smart Degen Move</h3>
              </div>
              <p className="text-black/70 text-sm max-w-lg mx-auto font-medium">
                Buy a token you believe in. Or don't - just bet that it'll fail instead. 
                Every token gets prediction markets attached. Hedge your bets, literally.
              </p>
            </motion.div>
          </motion.section>

          {/* Waitlist Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-800 border-2 border-black rounded-2xl p-8 space-y-6 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white">Get Early Access</h2>
              <p className="text-gray-400">Join the waitlist and be first to launch</p>
            </div>

            {submitStatus === "success" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-green-400 border-2 border-black rounded-xl text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <p className="text-black font-black text-lg">You're on the list!</p>
                <p className="text-black/70 text-sm mt-2 font-medium">
                  We'll notify you the moment we launch.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-5 py-4 bg-white border-2 border-black rounded-xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-center sm:text-left font-medium shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="input-email"
                />
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className="px-8 py-4 bg-red-500 text-white font-black rounded-xl border-2 border-black hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="button-join-waitlist"
                >
                  {isSubmitting ? "..." : "Join"}
                </motion.button>
              </form>
            )}

            {submitStatus === "error" && (
              <p className="text-red-400 text-sm text-center font-bold">{errorMessage}</p>
            )}
          </motion.section>

          {/* Referral Section */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-6 h-6 text-pink-400" />
                <h2 className="text-2xl font-black text-white">Referral Program</h2>
              </div>
              <p className="text-gray-400">Invite friends, earn rewards at launch</p>
            </div>

            {!connectedWallet ? (
              <div className="bg-zinc-800 border-2 border-black rounded-xl p-8 text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(251,207,232,1)]">
                <p className="text-gray-300 font-medium">
                  Connect your wallet to get your unique referral link
                </p>
                <motion.button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className="px-8 py-4 bg-pink-400 text-black font-black rounded-xl border-2 border-black hover:bg-pink-500 disabled:opacity-50 transition-all uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="button-connect-wallet"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </motion.button>
                {referralCode && (
                  <p className="text-xs text-gray-500">
                    Referred by: <span className="text-pink-400 font-mono font-bold">{referralCode}</span>
                  </p>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-800 border-2 border-black rounded-xl p-6 space-y-6 shadow-[4px_4px_0px_0px_rgba(251,207,232,1)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Your Referral Code</p>
                    <p className="text-2xl font-mono font-black text-pink-400">
                      {user?.referralCode || "Loading..."}
                    </p>
                  </div>
                  <div className="text-center sm:text-right bg-pink-400 border-2 border-black rounded-lg px-4 py-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-3xl font-black text-black">{user?.referralCount ?? 0}</p>
                    <p className="text-xs text-black/70 uppercase font-bold">Referrals</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-white border-2 border-black rounded-lg text-sm font-mono text-gray-700 truncate shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {user?.referralCode 
                      ? `${window.location.origin}?ref=${user.referralCode}`
                      : "Loading..."
                    }
                  </div>
                  <motion.button
                    onClick={copyReferralLink}
                    whileHover={{ y: -1, x: -1 }}
                    whileTap={{ y: 0, x: 0 }}
                    disabled={!user?.referralCode}
                    className="px-5 py-3 bg-pink-400 text-black font-bold rounded-lg border-2 border-black hover:bg-pink-500 disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    data-testid="button-copy-referral"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </motion.button>
                </div>

                <p className="text-xs text-gray-400 text-center font-medium">
                  Top referrers will receive bonus rewards at launch
                </p>
              </motion.div>
            )}
          </motion.section>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="border-t border-zinc-800 pt-8 space-y-4"
          >
            <div className="flex items-center justify-center gap-6 text-sm">
              <a href="#" className="text-gray-500 hover:text-white transition-colors">About</a>
              <a href="#" className="text-gray-500 hover:text-white transition-colors">Terms</a>
              <button
                onClick={() => alert("LOL NO! 😂")}
                className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                data-testid="link-refund"
              >
                Refund
              </button>
            </div>
            <div className="text-center text-xs text-gray-600 space-y-1">
              <p>Building the dumbest way to make money on Solana</p>
              <p className="font-mono">@dumfun</p>
            </div>
          </motion.footer>
        </div>
      </div>
    </Layout>
  );
}
