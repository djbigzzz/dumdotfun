import { Layout } from "@/components/layout";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Users, Rocket, Zap, Target, Clock, ChevronRight, ChevronDown } from "lucide-react";

interface UserWithReferrals {
  id: string;
  walletAddress: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

const LAUNCH_DATE = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

function PillHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVideoUpdate = useRef(0);
  const rafId = useRef<number | null>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  const topHalfY = useTransform(smoothProgress, [0, 0.3, 0.5], [0, -60, -120]);
  const bottomHalfY = useTransform(smoothProgress, [0, 0.3, 0.5], [0, 60, 120]);
  const topHalfRotate = useTransform(smoothProgress, [0, 0.3, 0.5], [0, -5, -15]);
  const bottomHalfRotate = useTransform(smoothProgress, [0, 0.3, 0.5], [0, 5, 15]);
  const pillScale = useTransform(smoothProgress, [0, 0.2], [1, 1.1]);
  const contentOpacity = useTransform(smoothProgress, [0.2, 0.4], [0, 1]);
  const liquidHeight = useTransform(smoothProgress, [0.3, 0.8], ["0%", "100%"]);
  const videoOpacity = useTransform(smoothProgress, [0.15, 0.35], [0, 1]);

  const dropletPositions = useMemo(() => 
    [...Array(8)].map((_, i) => ({
      left: (Math.random() - 0.5) * 60,
      topOffset: i * 80 + Math.random() * 40,
      duration: 2 + Math.random(),
    })), []
  );

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    
    const unsubscribe = scrollYProgress.on("change", (v) => {
      const now = performance.now();
      if (now - lastVideoUpdate.current < 50) return;
      
      if (rafId.current) cancelAnimationFrame(rafId.current);
      
      rafId.current = requestAnimationFrame(() => {
        if (videoRef.current) {
          const duration = videoRef.current.duration || 0;
          if (duration > 0) {
            videoRef.current.currentTime = v * duration * 0.8;
          }
        }
        lastVideoUpdate.current = now;
      });
    });
    
    return () => {
      unsubscribe();
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [scrollYProgress]);

  return (
    <div ref={containerRef} className="relative min-h-[200vh]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <motion.div 
          style={{ scale: pillScale }}
          className="relative w-[280px] h-[480px] md:w-[350px] md:h-[600px]"
        >
          <motion.div
            style={{ y: topHalfY, rotate: topHalfRotate }}
            className="absolute top-0 left-0 right-0 h-1/2 origin-bottom"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="topGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
                <filter id="pillShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="4" dy="4" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
              </defs>
              <path
                d="M20,200 L20,80 Q20,0 100,0 Q180,0 180,80 L180,200 Z"
                fill="url(#topGradient)"
                stroke="#000"
                strokeWidth="4"
                filter="url(#pillShadow)"
              />
              <ellipse cx="60" cy="50" rx="20" ry="30" fill="rgba(255,255,255,0.3)" />
            </svg>
          </motion.div>

          <motion.div
            style={{ y: bottomHalfY, rotate: bottomHalfRotate }}
            className="absolute bottom-0 left-0 right-0 h-1/2 origin-top"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="bottomGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fda4af" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
              <path
                d="M20,0 L20,120 Q20,200 100,200 Q180,200 180,120 L180,0 Z"
                fill="url(#bottomGradient)"
                stroke="#000"
                strokeWidth="4"
                filter="url(#pillShadow)"
              />
            </svg>
          </motion.div>

          <motion.div
            style={{ opacity: videoOpacity }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <div className="w-[200px] h-[340px] md:w-[250px] md:h-[420px] overflow-hidden rounded-[80px]">
              <video
                ref={videoRef}
                src="/videos/pill-video.mp4"
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="auto"
              />
            </div>
          </motion.div>

          <motion.div
            style={{ opacity: contentOpacity }}
            className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center px-4"
          >
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-lg">
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">DUM</span>
              <span className="text-yellow-300">.</span>
              <span className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">FUN</span>
            </h1>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-gray-500 text-sm font-bold uppercase tracking-wider">Scroll to open</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-6 h-6 text-red-500" />
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        style={{ height: liquidHeight }}
        className="absolute left-1/2 -translate-x-1/2 w-16 md:w-24 top-[100vh] bg-gradient-to-b from-red-500 via-pink-400 to-pink-300 rounded-b-full z-0"
      />
      
      {dropletPositions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full bg-pink-400 opacity-60"
          style={{
            left: `calc(50% + ${pos.left}px)`,
            top: `calc(100vh + ${pos.topOffset}px)`,
          }}
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: pos.duration,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

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
        className={`${color} border-2 border-black rounded-full p-3 md:p-4 min-w-[65px] md:min-w-[85px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
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

function PillCard({ children, className = "", color = "white" }: { children: React.ReactNode; className?: string; color?: string }) {
  const bgColors: Record<string, string> = {
    white: "bg-white",
    red: "bg-red-500",
    pink: "bg-pink-300",
    green: "bg-green-400",
  };
  
  return (
    <motion.div
      whileHover={{ y: -3, x: -2 }}
      className={`${bgColors[color]} border-2 border-black rounded-[40px] p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

function FloatingPills() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 30}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          <div 
            className={`w-8 h-16 md:w-12 md:h-24 rounded-full opacity-20 ${
              i % 2 === 0 ? 'bg-red-400' : 'bg-pink-300'
            }`}
          />
        </motion.div>
      ))}
    </div>
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
      const link = `https://dum.fun?ref=${user.referralCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout>
      <div className="relative">
        <FloatingPills />
        
        <PillHero />
        
        <div className="relative z-10 -mt-32 md:-mt-48">
          <div className="max-w-5xl mx-auto px-4 space-y-12">
            
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center space-y-6 pt-16"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-black rounded-full shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]"
              >
                <Clock className="w-4 h-4 text-red-500" />
                <span className="text-red-500 font-black text-sm uppercase tracking-wider">
                  Launching Soon
                </span>
              </motion.div>

              <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                <span className="text-red-500">DUM</span>
                <span className="text-pink-400">.</span>
                <span className="text-pink-300">FUN</span>
              </h2>

              <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto leading-relaxed font-bold">
                Launch tokens. Bet on rugs.{" "}
                <span className="text-green-600 font-black">Make money either way.</span>
              </p>

              <p className="text-base text-gray-500 max-w-xl mx-auto">
                The only platform where you can launch your own meme coin{" "}
                <span className="text-red-500 font-bold">AND</span> bet that the dev will rug.{" "}
                Win-win, degen style.
              </p>

              <div className="py-8">
                <CountdownTimer />
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-center text-2xl font-black text-gray-900">
                How It Works
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <PillCard color="red">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Rocket className="w-7 h-7 text-red-500" />
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
                </PillCard>

                <PillCard color="pink">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Target className="w-7 h-7 text-pink-500" />
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
                </PillCard>
              </div>

              <PillCard color="green" className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Zap className="w-6 h-6 text-black" />
                  <h3 className="text-lg font-black text-black">The Smart Degen Move</h3>
                </div>
                <p className="text-black/70 text-sm max-w-lg mx-auto font-medium">
                  Buy a token you believe in. Or don't - just bet that it'll fail instead. 
                  Every token gets prediction markets attached. Hedge your bets, literally.
                </p>
              </PillCard>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <PillCard color="white" className="space-y-6 shadow-[6px_6px_0px_0px_rgba(239,68,68,1)]">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-gray-900">Get Early Access</h2>
                  <p className="text-gray-600">Join the waitlist and be first to launch</p>
                </div>

                {submitStatus === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-green-400 border-2 border-black rounded-full text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
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
                      className="flex-1 px-5 py-4 bg-white border-2 border-black rounded-full text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-center sm:text-left font-medium shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      data-testid="input-email"
                    />
                    <motion.button
                      type="submit"
                      disabled={isSubmitting || !email.trim()}
                      whileHover={{ y: -2, x: -2 }}
                      whileTap={{ y: 0, x: 0 }}
                      className="px-8 py-4 bg-red-500 text-white font-black rounded-full border-2 border-black hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      data-testid="button-join-waitlist"
                    >
                      {isSubmitting ? "..." : "Join"}
                    </motion.button>
                  </form>
                )}

                {submitStatus === "error" && (
                  <p className="text-red-400 text-sm text-center font-bold">{errorMessage}</p>
                )}
              </PillCard>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-6 h-6 text-pink-500" />
                  <h2 className="text-2xl font-black text-gray-900">Referral Program</h2>
                </div>
                <p className="text-gray-600">Invite friends, earn rewards at launch</p>
              </div>

              {!connectedWallet ? (
                <PillCard color="white" className="text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(251,113,133,1)]">
                  <p className="text-gray-700 font-medium">
                    Connect your wallet to get your unique referral link
                  </p>
                  <motion.button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    whileHover={{ y: -2, x: -2 }}
                    whileTap={{ y: 0, x: 0 }}
                    className="px-8 py-4 bg-pink-400 text-black font-black rounded-full border-2 border-black hover:bg-pink-500 disabled:opacity-50 transition-all uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    data-testid="button-connect-wallet"
                  >
                    {isConnecting ? "Connecting..." : "Connect Wallet"}
                  </motion.button>
                  {referralCode && (
                    <p className="text-xs text-gray-500">
                      Referred by: <span className="text-pink-400 font-mono font-bold">{referralCode}</span>
                    </p>
                  )}
                </PillCard>
              ) : (
                <PillCard color="white" className="space-y-6 shadow-[4px_4px_0px_0px_rgba(251,113,133,1)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Your Referral Code</p>
                      <p className="text-2xl font-mono font-black text-pink-500">
                        {user?.referralCode || "Loading..."}
                      </p>
                    </div>
                    <div className="text-center sm:text-right bg-pink-400 border-2 border-black rounded-full px-6 py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <p className="text-3xl font-black text-black">{user?.referralCount ?? 0}</p>
                      <p className="text-xs text-black/70 uppercase font-bold">Referrals</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-gray-100 border-2 border-black rounded-full text-sm font-mono text-gray-700 truncate shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {user?.referralCode 
                        ? `https://dum.fun?ref=${user.referralCode}`
                        : "Loading..."
                      }
                    </div>
                    <motion.button
                      onClick={copyReferralLink}
                      whileHover={{ y: -1, x: -1 }}
                      whileTap={{ y: 0, x: 0 }}
                      disabled={!user?.referralCode}
                      className="px-5 py-3 bg-pink-400 text-black font-bold rounded-full border-2 border-black hover:bg-pink-500 disabled:opacity-50 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      data-testid="button-copy-referral"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </motion.button>
                  </div>

                  <p className="text-xs text-gray-500 text-center font-medium">
                    Top referrers will receive bonus rewards at launch
                  </p>
                </PillCard>
              )}
            </motion.section>

            <motion.footer
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="border-t-2 border-black pt-8 pb-16 space-y-4"
            >
              <div className="flex items-center justify-center gap-6 text-sm">
                <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors font-medium">About</a>
                <a href="#" className="text-gray-500 hover:text-gray-900 transition-colors font-medium">Terms</a>
                <button
                  onClick={() => alert("LOL NO!")}
                  className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer font-medium"
                  data-testid="link-refund"
                >
                  Refund
                </button>
              </div>
              <div className="text-center text-xs text-gray-500 space-y-1">
                <p>Building the dumbest way to make money on Solana</p>
                <p className="font-mono font-bold">@dumfun</p>
              </div>
            </motion.footer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
