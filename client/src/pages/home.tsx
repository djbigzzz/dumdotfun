import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Mail, ChevronDown, Twitter, Github, Send } from "lucide-react";
import { toast } from "sonner";

import heroLogo from "@assets/Gemini_Generated_Image_x5cev6x5cev6x5ce_1764330353637.png";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Calculate countdown
  useEffect(() => {
    const launchDate = new Date("2025-12-15T00:00:00").getTime();
    
    const calculateCountdown = () => {
      const now = new Date().getTime();
      const difference = launchDate - now;

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("You're on the list! 🔥");
        setEmail("");
      } else if (response.status === 400 && data.error.includes("already")) {
        toast.error("Already signed up, degen!");
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch (error) {
      toast.error("Failed to sign up");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      q: "What is Dum.fun?",
      a: "Dum.fun is a satirical anti-launchpad that parodies crypto meme coin platforms. On Dum.fun, tokens launch EXPENSIVE and crash IMMEDIATELY. It's a brutally honest mirror of crypto degen culture.",
    },
    {
      q: "How is this different from Pump.fun?",
      a: "Pump.fun lets tokens launch cheap and pump up. Dum.fun flips the script completely. Tokens start expensive, prices only go down. We're not pretending it's anything other than what it is.",
    },
    {
      q: "Is this a real product?",
      a: "Dum.fun is a design concept and interactive mockup. It's a satirical commentary on the absurdity of the crypto ecosystem. All data is simulated for demonstration purposes.",
    },
    {
      q: "Can I really buy tokens on Dum.fun?",
      a: "Not yet. This is the coming soon page. The platform launches soon. Join the waitlist to be notified when we go live.",
    },
    {
      q: "Will there be a Village Idiot Leaderboard?",
      a: "Yes! We celebrate the fastest crashers. The coin losing money the quickest gets the spotlight. It's a leaderboard of failure where you can flex your losses.",
    },
  ];

  return (
    <Layout>
      {/* Hero Section with Glitch Effect */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center mb-16 space-y-8 relative">
        {/* Glitch Background Elements */}
        <motion.div
          animate={{ x: [0, 2, -2, 0], y: [0, -2, 2, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute top-10 left-10 w-32 h-32 border-2 border-red-500 opacity-20"
        />
        <motion.div
          animate={{ x: [0, -3, 3, 0], y: [0, 3, -3, 0] }}
          transition={{ repeat: Infinity, duration: 5 }}
          className="absolute bottom-20 right-10 w-40 h-40 border-2 border-yellow-500 opacity-20"
        />

        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="space-y-8 flex flex-col items-center relative z-10"
        >
          {/* Hero Logo */}
          <motion.img
            src={heroLogo}
            alt="DUM.FUN"
            className="h-64 md:h-80 w-auto drop-shadow-lg"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          />

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-black uppercase text-red-500">
              The Anti-Launchpad
            </h1>
            <p className="text-xl md:text-2xl text-yellow-500 font-black">
              Where Tokens Launch EXPENSIVE & Crash IMMEDIATELY
            </p>
            <p className="text-lg text-gray-300 font-mono">
              The satirical mirror crypto deserves
            </p>
          </motion.div>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-black border-4 border-red-500 p-8 w-full max-w-2xl shadow-[0_0_30px_rgba(239,68,68,0.3)]"
          >
            <p className="text-gray-400 font-mono text-sm mb-4">LAUNCHES IN</p>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "DAYS", value: countdown.days },
                { label: "HRS", value: countdown.hours },
                { label: "MIN", value: countdown.minutes },
                { label: "SEC", value: countdown.seconds },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-center bg-red-950/20 border-2 border-red-900 p-4"
                >
                  <p className="text-3xl md:text-4xl font-black text-red-500">
                    {String(item.value).padStart(2, "0")}
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-2">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Email Signup */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            onSubmit={handleEmailSignup}
            className="w-full max-w-lg space-y-3"
          >
            <p className="text-gray-400 font-mono text-sm">JOIN THE WAITLIST</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-zinc-950 border-2 border-red-500 px-4 py-3 text-white font-mono focus:outline-none focus:border-yellow-500 focus:shadow-[0_0_20px_rgba(234,179,8,0.3)]"
                disabled={isSubmitting}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isSubmitting}
                className="bg-red-500 hover:bg-red-600 text-white font-black px-6 py-3 border-2 border-white flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "..." : "NOTIFY"}
              </motion.button>
            </div>
          </motion.form>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mt-8"
          >
            <ChevronDown className="w-8 h-8 text-red-500 mx-auto" />
          </motion.div>
        </motion.div>
      </section>

      {/* The Concept Section */}
      <section className="border-4 border-red-500 bg-black p-12 mb-16 space-y-6">
        <h2 className="text-4xl font-black uppercase text-red-500">The Concept</h2>
        <div className="space-y-4 text-gray-300 font-mono leading-relaxed text-lg">
          <p>
            Pump.fun made creating tokens a game where anyone could get rich quick. Dum.fun is the same thing, but we're not pretending it's anything other than what it is: a satirical mirror of crypto degen culture.
          </p>
          <p>
            On Dum.fun, we flip the script. Tokens launch expensive. Prices can only drop. The UI is intentionally chaotic. It's brutally honest about the industry's absurdity.
          </p>
          <p>
            This is not financial advice. This is art. This is commentary. This is what happens when you take the chaos and make it beautiful.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-16 space-y-8">
        <h2 className="text-5xl font-black uppercase text-red-500 text-center mb-12">
          FAQ
        </h2>
        <div className="space-y-3 max-w-3xl mx-auto">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              className="border-2 border-red-900 overflow-hidden"
            >
              <button
                onClick={() =>
                  setOpenFaqIndex(openFaqIndex === idx ? null : idx)
                }
                className="w-full bg-red-950/30 hover:bg-red-950/50 p-4 text-left flex justify-between items-center font-black uppercase text-gray-100 transition-all"
              >
                <span>{faq.q}</span>
                <motion.div
                  animate={{ rotate: openFaqIndex === idx ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="w-5 h-5 text-red-500" />
                </motion.div>
              </button>
              <motion.div
                initial={{ height: 0 }}
                animate={{
                  height: openFaqIndex === idx ? "auto" : 0,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden bg-black"
              >
                <p className="p-4 text-gray-300 font-mono text-sm leading-relaxed">
                  {faq.a}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Links Section */}
      <section className="border-2 border-red-500 bg-zinc-900 p-8 text-center space-y-6 mb-16">
        <h3 className="text-2xl font-black uppercase text-red-500">
          Stay Connected
        </h3>
        <div className="flex justify-center gap-6">
          <motion.a
            whileHover={{ scale: 1.1 }}
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-500 hover:bg-red-600 text-white font-black p-4 border-2 border-white transition-all flex items-center gap-2"
          >
            <Twitter className="w-5 h-5" />
            TWITTER
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.1 }}
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-500 hover:bg-red-600 text-white font-black p-4 border-2 border-white transition-all flex items-center gap-2"
          >
            <Github className="w-5 h-5" />
            GITHUB
          </motion.a>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border border-red-900 bg-zinc-900 p-8 text-center">
        <p className="text-gray-500 font-mono text-xs">
          ⚠️ This is a design concept and interactive mockup. Dum.fun is not a real product.
          All data shown is simulated for demonstration purposes only. This is not financial
          advice.
        </p>
      </section>
    </Layout>
  );
}
