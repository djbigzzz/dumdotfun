import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Book, Zap, TrendingUp, Coins, HelpCircle, Shield, Rocket, DollarSign, Cpu, Trophy } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useState } from "react";

interface DocSection {
  id: string;
  icon: React.ElementType;
  title: string;
  content: React.ReactNode;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse rounded-lg overflow-hidden border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left font-bold text-xs uppercase tracking-wider text-gray-600 border-b border-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-100`}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 ${j === 0 ? "font-semibold" : ""} text-gray-700`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-bold text-base mt-5 mb-2 text-gray-900">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-gray-600">{children}</p>;
}

function Ul({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 mb-3 ml-1 text-gray-600">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Ol({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-2 mb-3 ml-1 text-gray-600">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 text-red-600">{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
      <div className="flex items-start gap-2">
        <span className="text-lg">{emoji}</span>
        <div>
          <div className="font-bold text-sm text-gray-900">{title}</div>
          <div className="text-xs mt-0.5 text-gray-500">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function buildSections(): DocSection[] {
  return [
    {
      id: "what-is-dumfun",
      icon: Rocket,
      title: "What is dum.fun?",
      content: (
        <>
          <Heading>The Meme Token Launchpad with Prediction Markets</Heading>
          <P>
            dum.fun is a token launchpad where you can create and trade meme tokens on Solana — with integrated prediction markets on every token. Winner of the <strong>Solana Privacy Hackathon 2026</strong> and recipient of a <strong>Solana Foundation Ireland grant</strong>.
          </P>

          <Table
            headers={["Feature", "Description"]}
            rows={[
              ["Token Launchpad", "Create SPL tokens with bonding curve pricing — free and instant"],
              ["Prediction Markets", "Bet on whether tokens will survive, graduate, or rug"],
              ["Seasonal Leaderboard", "Compete for SOL rewards in seasonal rankings"],
              ["Raydium Migration", "Tokens auto-graduate to Raydium DEX at 85 SOL liquidity"],
              ["Quests & Points", "Earn points and climb tiers through gamified activities"],
            ]}
          />

          <Heading>How It Works</Heading>
          <Ol items={[
            <><strong>Connect Phantom Wallet</strong> — Click "LOG IN" in the header</>,
            <><strong>Get Devnet SOL</strong> — Use the airdrop button (we're on Solana devnet)</>,
            <><strong>Launch a Token</strong> — Go to Launch, fill in details, deploy on-chain</>,
            <><strong>Trade on Bonding Curve</strong> — Buy and sell tokens with automatic pricing</>,
            <><strong>Bet on Predictions</strong> — Each token has prediction markets you can bet on</>,
          ]} />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
            Network: Solana Devnet (testnet — no real money)
          </div>
        </>
      ),
    },
    {
      id: "devnet-status",
      icon: Shield,
      title: "Platform Status",
      content: (
        <>
          <Heading>Live on Solana Devnet</Heading>
          <P>
            Deploy real SPL tokens on Solana devnet with integrated prediction markets, gamified quests, and seasonal leaderboards.
          </P>

          <Table
            headers={["Feature", "Status"]}
            rows={[
              ["On-chain token creation", "✅ Live"],
              ["Phantom wallet connection", "✅ Live"],
              ["Bonding curve trading", "✅ Live"],
              ["Prediction markets", "✅ Live"],
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
          <P>
            dum.fun is a Solana-based token launchpad with integrated prediction markets. Unlike other launchpads, every token launched here automatically gets prediction markets attached — so you can bet on whether a token will moon, graduate to DEX, or if the dev will rug.
          </P>
          <P>
            We combine meme token culture with real prediction market functionality. Think pump.fun meets Kalshi, but for degens.
          </P>

          <Table
            headers={["Component", "What It Does"]}
            rows={[
              ["Launchpad", "Create SPL tokens with automatic bonding curves"],
              ["Prediction Markets", "Bet YES/NO on token outcomes with real SOL"],
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
          <Heading>Launching a Token</Heading>
          <Ol items={[
            "Connect your Phantom wallet",
            "Fill in token details (name, symbol, description, image)",
            "Pay the 0.05 SOL creation fee",
            "Your token is live with a bonding curve!",
          ]} />

          <Heading>Trading Tokens</Heading>
          <P>
            Tokens start on a bonding curve — early buyers get lower prices. As more people buy, the price increases. When the bonding curve reaches 85 SOL in liquidity, the token "graduates" to Raydium DEX with real liquidity.
          </P>

          <Heading>Prediction Markets</Heading>
          <P>
            Every token automatically gets prediction markets. Bet YES or NO on outcomes like:
          </P>
          <Ul items={[
            "Will the token graduate to DEX?",
            "Will it hit 1M market cap?",
            "Will the dev rug?",
          ]} />
          <P>
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
          <P>
            The bonding curve is a mathematical formula that determines token price based on supply. It creates fair, transparent pricing without needing initial liquidity.
          </P>

          <Table
            headers={["Action", "Effect on Price"]}
            rows={[
              ["Buy tokens", "Price goes UP — supply increases"],
              ["Sell tokens", "Price goes DOWN — supply decreases"],
              ["Early buy", "Cheapest prices — reward early believers"],
              ["Graduation", "At 85 SOL liquidity, migrates to Raydium DEX"],
            ]}
          />

          <Heading>Why Bonding Curves?</Heading>
          <Ul items={[
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
          <P>
            Every token on dum.fun comes with prediction markets — questions you can bet on with real SOL.
          </P>

          <Heading>How Betting Works</Heading>
          <Table
            headers={["Concept", "Explanation"]}
            rows={[
              ["Markets", "Each market has YES and NO sides"],
              ["Shares", "Buy shares of the outcome you believe in"],
              ["Pricing", "Prices reflect the crowd's probability estimate"],
              ["Win payout", "Correct shares pay out at full value"],
              ["Loss", "Incorrect shares are worth nothing"],
            ]}
          />

          <Heading>Example</Heading>
          <div className="p-4 rounded-lg border mb-3 border-gray-200 bg-gray-50">
            <P>
              <strong>"Will $DOGE graduate to DEX?"</strong>
            </P>
            <Ul items={[
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
          <Table
            headers={["Fee Type", "Amount", "When Applied"]}
            rows={[
              ["Token Creation", "0.05 SOL", "One-time fee to launch your token"],
              ["Market Creation", "0.05 SOL", "Create custom prediction markets"],
              ["Trading Fee", "1%", "All bonding curve trades (buy & sell)"],
              ["Betting Fee", "2%", "Prediction market bets"],
            ]}
          />
          <P>
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
          <Heading>Earn Points</Heading>
          <P>
            Complete quests and activities to earn points. Points determine your tier and leaderboard position.
          </P>

          <Table
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

          <Heading>Tier System</Heading>
          <Table
            headers={["Tier", "Points Required", "Perk"]}
            rows={[
              ["💊 Fresh Pill", "0", "Starting tier"],
              ["📈 Curve Rider", "500", "Basic recognition"],
              ["🔥 Full Degen", "2,000", "Degen status unlocked"],
              ["🛡️ Diamond Hands", "5,000", "Elite trader badge"],
              ["💎 On-Chain God", "10,000", "Legendary status"],
            ]}
          />

          <Heading>Seasonal Leaderboard</Heading>
          <P>
            Compete in named seasons for SOL rewards. Season 1 "Genesis" runs until mainnet launch. Top 10 players earn real SOL.
          </P>

          <Table
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

          <Heading>OG Card</Heading>
          <P>
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
          <P>
            <strong>Trading involves significant risk. Always do your own research (DYOR).</strong>
          </P>
          <P>
            dum.fun is a platform for meme tokens and prediction markets. All tokens are currently launched on Solana Devnet (testnet).
          </P>
          <Heading>Safety Features</Heading>
          <Ul items={[
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
      id: "integrations",
      icon: Cpu,
      title: "Platform Integrations",
      content: (
        <>
          <P>
            dum.fun is built on top of Solana's ecosystem with enterprise-grade infrastructure.
          </P>

          <Table
            headers={["Integration", "What It Does"]}
            rows={[
              ["Helius RPC", "Enterprise-grade Solana connections with real-time transaction processing"],
              ["Raydium DEX", "CPMM pool creation for graduated tokens"],
              ["Phantom Wallet", "Primary wallet for signing and connecting"],
              ["Token-2022", "Solana's native token standard for advanced token features"],
            ]}
          />

          <Heading>Links</Heading>
          <Ul items={[
            <><a href="https://www.helius.dev" target="_blank" rel="noopener noreferrer" className="font-bold underline text-red-500">Helius</a> — Solana RPC infrastructure</>,
            <><a href="https://raydium.io" target="_blank" rel="noopener noreferrer" className="font-bold underline text-red-500">Raydium</a> — DEX for graduated token liquidity</>,
            <><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="font-bold underline text-red-500">Phantom</a> — Solana wallet</>,
            <><a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="font-bold underline text-red-500">Solana</a> — Layer 1 blockchain</>,
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
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const sections = buildSections();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-black text-gray-900">
              Documentation
            </h1>
          </div>
          <p className="mt-1 text-gray-600">
            Everything you need to know about dum.fun
          </p>
        </motion.div>

        <nav className="rounded-xl p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-bold text-sm mb-3 uppercase tracking-wider text-gray-400">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 border border-gray-200"
              >
                {section.title}
              </a>
            ))}
            <a
              href="#faq"
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 border border-gray-200"
            >
              FAQ
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
              className="rounded-xl p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100">
                  <section.icon className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900">
                  {section.title}
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
          className="rounded-xl p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-yellow-100">
              <HelpCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-black text-gray-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-1">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-lg overflow-hidden border border-gray-100">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    expandedFaq === index ? "bg-red-50" : "hover:bg-gray-50"
                  }`}
                  data-testid={`faq-toggle-${index}`}
                >
                  <span className="font-bold text-sm text-gray-900">
                    {faq.q}
                  </span>
                  <motion.span
                    animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                    className="text-xs text-gray-400"
                  >
                    ▼
                  </motion.span>
                </button>
                {expandedFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="px-4 pb-3 text-sm text-gray-600"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        <div className="text-center py-6 text-sm text-gray-500">
          <p>Still have questions? DM us on X:{" "}
            <a href="https://x.com/dumdotfun" target="_blank" rel="noopener noreferrer" className="font-bold hover:underline text-red-500" data-testid="link-twitter">
              @dumdotfun
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
