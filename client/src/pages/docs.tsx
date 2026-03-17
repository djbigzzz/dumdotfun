import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Book, Zap, TrendingUp, Coins, HelpCircle, Shield, Rocket, DollarSign, Lock, Eye, Cpu, Trophy, ExternalLink, Award } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";
import { usePageTitle } from "@/hooks/use-page-title";
import { useState } from "react";

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  content: React.ReactNode;
}

function Table({ headers, rows, privateMode }: { headers: string[]; rows: string[][]; privateMode: boolean }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className={`w-full text-sm border-collapse rounded-lg overflow-hidden ${privateMode ? "border border-[#4ADE80]/20" : "border border-gray-200"}`}>
        <thead>
          <tr className={privateMode ? "bg-[#4ADE80]/10" : "bg-gray-50"}>
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-2.5 text-left font-bold text-xs uppercase tracking-wider ${
                privateMode ? "text-[#4ADE80] border-b border-[#4ADE80]/20" : "text-gray-600 border-b border-gray-200"
              }`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`${i % 2 === 0 ? (privateMode ? "bg-zinc-900/30" : "bg-white") : (privateMode ? "bg-zinc-800/30" : "bg-gray-50/50")} ${
              privateMode ? "border-b border-[#4ADE80]/5" : "border-b border-gray-100"
            }`}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 ${j === 0 ? "font-semibold" : ""} ${privateMode ? "text-white/80" : "text-gray-700"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heading({ children, privateMode }: { children: React.ReactNode; privateMode: boolean }) {
  return (
    <h3 className={`font-bold text-base mt-5 mb-2 ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-900"}`}>
      {children}
    </h3>
  );
}

function P({ children, privateMode }: { children: React.ReactNode; privateMode: boolean }) {
  return <p className={`mb-3 text-sm leading-relaxed ${privateMode ? "text-white/70" : "text-gray-600"}`}>{children}</p>;
}

function Ul({ items, privateMode }: { items: React.ReactNode[]; privateMode: boolean }) {
  return (
    <ul className={`space-y-1.5 mb-3 ml-1 ${privateMode ? "text-white/70" : "text-gray-600"}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${privateMode ? "bg-[#4ADE80]/50" : "bg-red-400"}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Ol({ items, privateMode }: { items: React.ReactNode[]; privateMode: boolean }) {
  return (
    <ol className={`space-y-2 mb-3 ml-1 ${privateMode ? "text-white/70" : "text-gray-600"}`}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            privateMode ? "bg-[#4ADE80]/15 text-[#4ADE80]" : "bg-red-100 text-red-600"
          }`}>{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Badge({ children, color, privateMode }: { children: React.ReactNode; color: string; privateMode: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
      privateMode ? `bg-${color}-500/15 text-${color}-400 border border-${color}-500/20` : `bg-${color}-100 text-${color}-700`
    }`}>{children}</span>
  );
}

function FeatureCard({ emoji, title, desc, privateMode }: { emoji: string; title: string; desc: string; privateMode: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${privateMode ? "border-[#4ADE80]/10 bg-zinc-800/30" : "border-gray-100 bg-gray-50"}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{emoji}</span>
        <div>
          <div className={`font-bold text-sm ${privateMode ? "text-white" : "text-gray-900"}`}>{title}</div>
          <div className={`text-xs mt-0.5 ${privateMode ? "text-white/50" : "text-gray-500"}`}>{desc}</div>
        </div>
      </div>
    </div>
  );
}

function buildSections(pm: boolean): DocSection[] {
  return [
    {
      id: "what-is-dumfun",
      icon: Rocket,
      title: "What is dum.fun?",
      content: (
        <>
          <Heading privateMode={pm}>The Privacy-First Meme Token Launchpad</Heading>
          <P privateMode={pm}>
            dum.fun is a token launchpad where you can create and trade meme tokens on Solana — with built-in privacy features that protect your trading activity. Winner of the <strong>Solana Privacy Hackathon 2026</strong> and recipient of a <strong>Solana Foundation Ireland grant</strong>.
          </P>

          <Table privateMode={pm}
            headers={["Feature", "Description"]}
            rows={[
              ["Token Launchpad", "Create SPL tokens with bonding curve pricing — free and instant"],
              ["Prediction Markets", "Bet on whether tokens will survive, graduate, or rug"],
              ["Privacy Mode", "Hide your bet amounts and trading activity with 7 privacy protocols"],
              ["Stealth Addresses", "Receive tokens without revealing your wallet address"],
              ["Seasonal Leaderboard", "Compete for SOL rewards in seasonal rankings"],
              ["Raydium Migration", "Tokens auto-graduate to Raydium DEX at 85 SOL liquidity"],
            ]}
          />

          <Heading privateMode={pm}>How It Works</Heading>
          <Ol privateMode={pm} items={[
            <><strong>Connect Phantom Wallet</strong> — Click "LOG IN" in the header</>,
            <><strong>Get Devnet SOL</strong> — Use the airdrop button (we're on Solana devnet)</>,
            <><strong>Launch a Token</strong> — Go to Launch, fill in details, deploy on-chain</>,
            <><strong>Trade on Bonding Curve</strong> — Buy and sell tokens with automatic pricing</>,
            <><strong>Enable Privacy Mode</strong> — Click the eye toggle for encrypted betting</>,
            <><strong>Bet on Predictions</strong> — Each token has prediction markets you can bet on</>,
          ]} />

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
            pm ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border border-yellow-200"
          }`}>
            Network: Solana Devnet (testnet — no real money)
          </div>
        </>
      ),
    },
    {
      id: "why-privacy",
      icon: Eye,
      title: "Why Privacy Matters",
      content: (
        <>
          <Heading privateMode={pm}>Your Wallet is a Public Diary</Heading>
          <P privateMode={pm}>
            Every Solana transaction you make is permanently recorded on a public blockchain. Anyone can see your entire history, holdings, and who you transact with.
          </P>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <FeatureCard emoji="🔍" title="Wallet Tracking" desc="Bots track whale wallets and front-run your trades" privateMode={pm} />
            <FeatureCard emoji="💰" title="Tax Exposure" desc="Employers & authorities can link your wallet via KYC" privateMode={pm} />
            <FeatureCard emoji="🎯" title="Hacker Targets" desc="Large balances are visible, making you a target" privateMode={pm} />
            <FeatureCard emoji="🏢" title="Data Selling" desc="Corporations profile and sell your on-chain behavior" privateMode={pm} />
          </div>

          <Heading privateMode={pm}>Privacy is a Right, Not a Crime</Heading>
          <Ul privateMode={pm} items={[
            <><strong>Personal Safety</strong> — Protect yourself from targeted attacks</>,
            <><strong>Business Confidentiality</strong> — Keep trading strategies private</>,
            <><strong>Financial Freedom</strong> — Transact without surveillance capitalism</>,
            <><strong>Human Rights</strong> — A fundamental right recognized by the UN</>,
          ]} />

          <P privateMode={pm}>
            dum.fun integrates privacy-preserving technologies so you can launch tokens, bet on predictions, and trade — all without exposing your identity or strategy.
          </P>
        </>
      ),
    },
    {
      id: "surveillance-explained",
      icon: Eye,
      title: "Understanding Wallet Surveillance",
      content: (
        <>
          <Heading privateMode={pm}>How You're Being Tracked</Heading>

          <Table privateMode={pm}
            headers={["Threat", "How It Works", "Impact"]}
            rows={[
              ["Block Explorers", "Index and make all transactions searchable (Solscan, SolanaFM)", "Complete wallet history exposed"],
              ["Analytics Companies", "Chainalysis, Elliptic build identity graphs linking wallets to people", "Your name tied to every transaction"],
              ["MEV Bots", "Monitor pending transactions and front-run large trades", "Value extracted from your trades"],
              ["Exchange Data", "KYC data links your identity to deposit addresses", "Entire on-chain history tied to you"],
            ]}
          />

          <Heading privateMode={pm}>Privacy Best Practices</Heading>
          <Ul privateMode={pm} items={[
            "Use different wallets for different purposes",
            "Utilize stealth addresses for receiving funds",
            "Enable confidential transfers when available",
            "Break on-chain links with privacy tools",
            "Don't reuse addresses unnecessarily",
          ]} />
        </>
      ),
    },
    {
      id: "devnet-status",
      icon: Shield,
      title: "Platform Status",
      content: (
        <>
          <Heading privateMode={pm}>Live on Solana Devnet</Heading>
          <P privateMode={pm}>
            Deploy real SPL tokens on Solana devnet with integrated prediction markets, gamified quests, and seasonal leaderboards.
          </P>

          <Table privateMode={pm}
            headers={["Feature", "Status"]}
            rows={[
              ["On-chain token creation", "✅ Live"],
              ["Phantom wallet connection", "✅ Live"],
              ["Bonding curve trading", "✅ Live"],
              ["Prediction markets", "✅ Live"],
              ["7 privacy protocols", "✅ Live"],
              ["Quests & points system", "✅ Live"],
              ["Seasonal leaderboard", "✅ Live"],
              ["Raydium DEX migration", "✅ Live"],
              ["OG Card NFT", "✅ Live"],
              ["Solana mainnet", "🔜 Coming soon"],
            ]}
          />
        </>
      ),
    },
    {
      id: "platform-overview",
      icon: Zap,
      title: "Platform Overview",
      content: (
        <>
          <P privateMode={pm}>
            dum.fun is a Solana-based token launchpad with integrated prediction markets. Unlike other launchpads, every token launched here automatically gets prediction markets attached — so you can bet on whether a token will moon, graduate to DEX, or if the dev will rug.
          </P>
          <P privateMode={pm}>
            We combine meme token culture with real prediction market functionality. Think pump.fun meets Kalshi, but for degens — with full privacy built in.
          </P>

          <Table privateMode={pm}
            headers={["Component", "What It Does"]}
            rows={[
              ["Launchpad", "Create SPL tokens with automatic bonding curves"],
              ["Prediction Markets", "Bet YES/NO on token outcomes with real SOL"],
              ["Privacy Layer", "7 protocols for confidential trading and stealth receiving"],
              ["Gamification", "Quests, points, tiers, OG Card, seasonal leaderboard"],
              ["DEX Migration", "Auto-graduate to Raydium CPMM pools at 85 SOL"],
            ]}
          />
        </>
      ),
    },
    {
      id: "how-it-works",
      icon: Rocket,
      title: "How Does It Work?",
      content: (
        <>
          <Heading privateMode={pm}>Launching a Token</Heading>
          <Ol privateMode={pm} items={[
            "Connect your Phantom wallet",
            "Fill in token details (name, symbol, description, image)",
            "Pay the 0.05 SOL creation fee",
            "Your token is live with a bonding curve!",
          ]} />

          <Heading privateMode={pm}>Trading Tokens</Heading>
          <P privateMode={pm}>
            Tokens start on a bonding curve — early buyers get lower prices. As more people buy, the price increases. When the bonding curve reaches 85 SOL in liquidity, the token "graduates" to Raydium DEX with real liquidity.
          </P>

          <Heading privateMode={pm}>Prediction Markets</Heading>
          <P privateMode={pm}>
            Every token automatically gets prediction markets. Bet YES or NO on outcomes like:
          </P>
          <Ul privateMode={pm} items={[
            "Will the token graduate to DEX?",
            "Will it hit 1M market cap?",
            "Will the dev rug?",
          ]} />
          <P privateMode={pm}>
            If you're right, you profit. If you're wrong, you lose your bet.
          </P>
        </>
      ),
    },
    {
      id: "bonding-curve",
      icon: TrendingUp,
      title: "Bonding Curve Explained",
      content: (
        <>
          <P privateMode={pm}>
            The bonding curve is a mathematical formula that determines token price based on supply. It creates fair, transparent pricing without needing initial liquidity.
          </P>

          <Table privateMode={pm}
            headers={["Action", "Effect on Price"]}
            rows={[
              ["Buy tokens", "Price goes UP — supply increases"],
              ["Sell tokens", "Price goes DOWN — supply decreases"],
              ["Early buy", "Cheapest prices — reward early believers"],
              ["Graduation", "At 85 SOL liquidity, migrates to Raydium DEX"],
            ]}
          />

          <Heading privateMode={pm}>Why Bonding Curves?</Heading>
          <Ul privateMode={pm} items={[
            "Fair pricing without needing market makers",
            "No initial liquidity required to launch",
            "Transparent math — price is deterministic",
            "Anti-rug: liquidity is locked in the curve until graduation",
          ]} />
        </>
      ),
    },
    {
      id: "prediction-markets",
      icon: Coins,
      title: "Prediction Markets",
      content: (
        <>
          <P privateMode={pm}>
            Every token on dum.fun comes with prediction markets — questions you can bet on with real SOL.
          </P>

          <Heading privateMode={pm}>How Betting Works</Heading>
          <Table privateMode={pm}
            headers={["Concept", "Explanation"]}
            rows={[
              ["Markets", "Each market has YES and NO sides"],
              ["Shares", "Buy shares of the outcome you believe in"],
              ["Pricing", "Prices reflect the crowd's probability estimate"],
              ["Win payout", "Correct shares pay out at full value"],
              ["Loss", "Incorrect shares are worth nothing"],
            ]}
          />

          <Heading privateMode={pm}>Example</Heading>
          <div className={`p-4 rounded-lg border mb-3 ${pm ? "border-[#4ADE80]/20 bg-zinc-800/30" : "border-gray-200 bg-gray-50"}`}>
            <P privateMode={pm}>
              <strong>"Will $DOGE graduate to DEX?"</strong>
            </P>
            <Ul privateMode={pm} items={[
              "YES is trading at 30¢ (crowd thinks 30% chance)",
              "You buy 100 YES shares for $30",
              <>If it graduates → you get $100 (<span className="text-green-500 font-bold">+$70 profit</span>)</>,
              <>If it doesn't → you get $0 (<span className="text-red-500 font-bold">-$30 loss</span>)</>,
            ]} />
          </div>
        </>
      ),
    },
    {
      id: "fees",
      icon: DollarSign,
      title: "Platform Fees",
      content: (
        <>
          <Table privateMode={pm}
            headers={["Fee Type", "Amount", "When Applied"]}
            rows={[
              ["Token Creation", "0.05 SOL", "One-time fee to launch your token"],
              ["Market Creation", "0.05 SOL", "Create custom prediction markets"],
              ["Trading Fee", "1%", "All bonding curve trades (buy & sell)"],
              ["Betting Fee", "2%", "Prediction market bets"],
            ]}
          />
          <P privateMode={pm}>
            All fees go to the platform treasury to fund development, liquidity, and seasonal leaderboard rewards.
          </P>
        </>
      ),
    },
    {
      id: "gamification",
      icon: Trophy,
      title: "Points, Quests & Seasons",
      content: (
        <>
          <Heading privateMode={pm}>Earn Points</Heading>
          <P privateMode={pm}>
            Complete quests and activities to earn points. Points determine your tier and leaderboard position.
          </P>

          <Table privateMode={pm}
            headers={["Quest", "Points", "Category"]}
            rows={[
              ["Connect Wallet", "50", "Onboarding"],
              ["First Trade", "100", "Activity"],
              ["First Prediction Bet", "100", "Activity"],
              ["Launch a Token", "500", "Activity"],
              ["Create a Market", "300", "Activity"],
              ["Win a Prediction", "200", "Activity"],
              ["Daily Check-in", "10/day", "Streaks"],
              ["7-Day Streak", "150", "Streaks"],
              ["30-Day Streak", "600", "Streaks"],
              ["Mint OG Card", "500", "Special"],
            ]}
          />

          <Heading privateMode={pm}>Tier System</Heading>
          <Table privateMode={pm}
            headers={["Tier", "Points Required", "Perk"]}
            rows={[
              ["💊 Fresh Pill", "0", "Starting tier"],
              ["📈 Curve Rider", "500", "Basic recognition"],
              ["🔥 Full Degen", "2,000", "Degen status unlocked"],
              ["🛡️ Diamond Hands", "5,000", "Elite trader badge"],
              ["💎 On-Chain God", "10,000", "Legendary status"],
            ]}
          />

          <Heading privateMode={pm}>Seasonal Leaderboard</Heading>
          <P privateMode={pm}>
            Compete in named seasons for SOL rewards. Season 1 "Genesis" runs until mainnet launch. Top 10 players earn real SOL.
          </P>

          <Table privateMode={pm}
            headers={["Rank", "Reward"]}
            rows={[
              ["#1", "1.5 SOL"],
              ["#2", "1.0 SOL"],
              ["#3", "0.75 SOL"],
              ["#4 - #5", "0.5 SOL each"],
              ["#6 - #7", "0.25 SOL each"],
              ["#8 - #9", "0.1 SOL each"],
              ["#10", "0.05 SOL"],
            ]}
          />

          <Heading privateMode={pm}>OG Card</Heading>
          <P privateMode={pm}>
            The OG Card is a limited NFT (0.2 SOL on mainnet) that grants a permanent <strong>1.5x points multiplier</strong> on all activities. OG holders earn more points, climb tiers faster, and get bigger seasonal rewards.
          </P>
        </>
      ),
    },
    {
      id: "safety",
      icon: Shield,
      title: "Safety & Trading",
      content: (
        <>
          <P privateMode={pm}>
            <strong>Trading involves significant risk. Always do your own research (DYOR).</strong>
          </P>
          <P privateMode={pm}>
            dum.fun is a platform for meme tokens and prediction markets. All tokens are currently launched on Solana Devnet (testnet).
          </P>
          <Heading privateMode={pm}>Safety Features</Heading>
          <Ul privateMode={pm} items={[
            "Real-time bonding curve tracking with TradingView charts",
            "Transparent token supply and holder data",
            "Verified creator wallet display",
            "Prediction market auto-resolution with on-chain checks",
            "Developer holding analysis for rug detection",
          ]} />
        </>
      ),
    },
    {
      id: "privacy",
      icon: Lock,
      title: "Privacy Features",
      content: (
        <>
          <Heading privateMode={pm}>Your Trading Activity, Your Business</Heading>
          <P privateMode={pm}>
            dum.fun integrates multiple privacy technologies so you can trade without exposing your strategy. We won the Solana Privacy Hackathon 2026 by integrating 7 privacy protocols.
          </P>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <FeatureCard emoji="🔒" title="Confidential Betting" desc="Bet amounts are encrypted — nobody sees how much you wagered" privateMode={pm} />
            <FeatureCard emoji="🕵️" title="Stealth Addresses" desc="One-time receive addresses for untraceable transactions" privateMode={pm} />
            <FeatureCard emoji="💳" title="Confidential Transfers" desc="Hidden amounts using Pedersen commitments (Token-2022)" privateMode={pm} />
            <FeatureCard emoji="🔐" title="Private Deposits" desc="Break on-chain links with ZK-proof deposits/withdrawals" privateMode={pm} />
          </div>

          <Heading privateMode={pm}>How to Use Privacy Mode</Heading>
          <Ol privateMode={pm} items={[
            <>Enable <strong>"Private Mode"</strong> toggle (eye icon in header)</>,
            "Bet amounts are automatically encrypted",
            "Generate stealth addresses in your Profile",
            "All transactions maintain your financial privacy",
          ]} />
        </>
      ),
    },
    {
      id: "integrations",
      icon: Cpu,
      title: "Privacy Protocol Integrations",
      content: (
        <>
          <P privateMode={pm}>
            dum.fun integrates 7 privacy protocols from the Solana ecosystem — the most comprehensive privacy stack on any DeFi platform.
          </P>

          <Table privateMode={pm}
            headers={["Protocol", "Technology", "What It Does"]}
            rows={[
              ["Inco Lightning", "Zero-knowledge proofs", "Encrypted prediction market bet amounts"],
              ["Stealth Addresses", "ECDH key exchange", "One-time unlinkable receive addresses"],
              ["Token-2022", "Pedersen commitments", "Confidential token transfer amounts"],
              ["Privacy Cash", "ZK-SNARK proofs", "Break deposit/withdrawal on-chain links"],
              ["ShadowWire", "Bulletproofs", "Hidden transfer amounts for 22+ tokens"],
              ["Arcium C-SPL", "MPC + AES-256-CTR", "Confidential token operations via multi-party computation"],
              ["NP Exchange", "AI agents", "Privacy-focused prediction market creation"],
            ]}
          />

          <Heading privateMode={pm}>Infrastructure</Heading>
          <Ul privateMode={pm} items={[
            <><a href="https://www.helius.dev" target="_blank" rel="noopener noreferrer" className={`font-bold underline ${pm ? "text-[#4ADE80]" : "text-red-500"}`}>Helius RPC</a> — Enterprise-grade Solana connections with real-time transaction processing</>,
            <><a href="https://raydium.io" target="_blank" rel="noopener noreferrer" className={`font-bold underline ${pm ? "text-[#4ADE80]" : "text-red-500"}`}>Raydium DEX</a> — CPMM pool creation for graduated tokens</>,
            <><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className={`font-bold underline ${pm ? "text-[#4ADE80]" : "text-red-500"}`}>Phantom Wallet</a> — Primary wallet for signing and connecting</>,
          ]} />
        </>
      ),
    },
  ];
}

const faqs = [
  { q: "How do I connect my wallet?", a: "Click the 'LOG IN' button in the top-right corner and select Phantom. Make sure you have the Phantom browser extension installed and set to Solana Devnet." },
  { q: "What wallet do I need?", a: "Currently Phantom is the primary supported wallet. Solflare and other Solana wallets may also work." },
  { q: "How much SOL do I need to launch a token?", a: "You need 0.05 SOL for the creation fee, plus a small amount for transaction fees (usually less than 0.01 SOL). On devnet, you can airdrop SOL for free." },
  { q: "Can I change my token after launching?", a: "No. Token name, symbol, and supply are permanent once created on-chain. Only social links can be updated." },
  { q: "What happens when a token graduates?", a: "When the bonding curve reaches 85 SOL in liquidity, the token automatically migrates to a Raydium CPMM pool. Trading continues on the open DEX with full liquidity." },
  { q: "How do prediction market odds work?", a: "Odds are determined by the ratio of YES to NO bets. If more people bet YES, YES becomes more expensive (reflecting a higher probability). Prices range from 0 to 1 SOL per share." },
  { q: "When do prediction markets resolve?", a: "Markets resolve when the outcome is determined. The platform checks on-chain data — developer holdings, token status, Raydium migration — to automatically resolve markets." },
  { q: "What is the OG Card?", a: "The OG Card is a limited NFT that costs 0.2 SOL on mainnet. It gives you a permanent 1.5x multiplier on all points earned, helping you climb the leaderboard faster and earn bigger seasonal rewards." },
  { q: "How do seasons work?", a: "Seasons are competitive periods where the top 10 players on the leaderboard earn real SOL rewards. Season 1 'Genesis' runs until mainnet launch. Earn points through quests, trading, and creating tokens." },
  { q: "Is dum.fun safe?", a: "Trading experimental meme tokens involves high risk. The platform is currently on Solana Devnet (testnet) — no real money is at stake. Never trade more than you can afford to lose when we go to mainnet." },
];

export default function DocsPage() {
  usePageTitle("/docs");
  const { privateMode } = usePrivacy();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const sections = buildSections(privateMode);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            {privateMode ? <Cpu className="w-8 h-8 text-[#4ADE80]" /> : <Book className="w-8 h-8 text-red-500" />}
            <h1 className={`text-3xl font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
              {privateMode ? "> SYSTEM_DOCUMENTATION" : "Documentation"}
            </h1>
          </div>
          <p className={`mt-1 ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-600"}`}>
            {privateMode ? "// ACCESSING_LOCAL_DATABASE" : "Everything you need to know about dum.fun"}
          </p>
        </motion.div>

        <nav className={`rounded-xl p-4 ${
          privateMode ? "bg-zinc-900/50 border border-[#4ADE80]/20" : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        }`}>
          <h2 className={`font-bold text-sm mb-3 uppercase tracking-wider ${privateMode ? "text-[#4ADE80]/50 font-mono" : "text-gray-400"}`}>
            {privateMode ? "> NAV_LINKS" : "Quick Links"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  privateMode
                    ? "bg-zinc-800 text-[#4ADE80]/70 hover:bg-[#4ADE80]/10 hover:text-[#4ADE80] border border-[#4ADE80]/10 font-mono"
                    : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 border border-gray-200"
                }`}
              >
                {privateMode ? section.title.toUpperCase().replace(/\s/g, '_') : section.title}
              </a>
            ))}
            <a
              href="#faq"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                privateMode
                  ? "bg-zinc-800 text-[#4ADE80]/70 hover:bg-[#4ADE80]/10 hover:text-[#4ADE80] border border-[#4ADE80]/10 font-mono"
                  : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 border border-gray-200"
              }`}
            >
              {privateMode ? "FAQ_INDEX" : "FAQ"}
            </a>
          </div>
        </nav>

        <div className="space-y-5">
          {sections.map((section, index) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3) }}
              className={`rounded-xl p-6 ${
                privateMode ? "bg-zinc-900/50 border border-[#4ADE80]/20" : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${
                  privateMode ? "bg-[#4ADE80]/10" : "bg-red-100"
                }`}>
                  <section.icon className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-red-600"}`} />
                </div>
                <h2 className={`text-lg font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
                  {privateMode ? section.title.toUpperCase().replace(/\s/g, '_') : section.title}
                </h2>
              </div>
              <div>{section.content}</div>
            </motion.section>
          ))}
        </div>

        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-6 ${
            privateMode ? "bg-zinc-900/50 border border-[#4ADE80]/20" : "bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg ${
              privateMode ? "bg-[#4ADE80]/10" : "bg-yellow-100"
            }`}>
              <HelpCircle className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-yellow-600"}`} />
            </div>
            <h2 className={`text-lg font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
              {privateMode ? "FREQUENTLY_ASKED_QUESTIONS" : "Frequently Asked Questions"}
            </h2>
          </div>

          <div className="space-y-1">
            {faqs.map((faq, index) => (
              <div key={index} className={`rounded-lg overflow-hidden ${
                privateMode ? "border border-[#4ADE80]/10" : "border border-gray-100"
              }`}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    expandedFaq === index
                      ? privateMode ? "bg-[#4ADE80]/5" : "bg-red-50"
                      : privateMode ? "hover:bg-[#4ADE80]/5" : "hover:bg-gray-50"
                  }`}
                  data-testid={`faq-toggle-${index}`}
                >
                  <span className={`font-bold text-sm ${privateMode ? "text-white" : "text-gray-900"}`}>
                    {privateMode ? `> ${faq.q}` : faq.q}
                  </span>
                  <motion.span
                    animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                    className={`text-xs ${privateMode ? "text-[#4ADE80]/50" : "text-gray-400"}`}
                  >
                    ▼
                  </motion.span>
                </button>
                {expandedFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className={`px-4 pb-3 text-sm ${privateMode ? "text-white/60 font-mono" : "text-gray-600"}`}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        <div className={`text-center py-6 text-sm ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-500"}`}>
          <p>Still have questions? DM us on X:{" "}
            <a href="https://x.com/dumdotfun" target="_blank" rel="noopener noreferrer" className={`font-bold hover:underline ${privateMode ? "text-[#4ADE80]" : "text-red-500"}`} data-testid="link-twitter">
              @dumdotfun
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
