import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Book, Zap, HelpCircle, Shield, Rocket, DollarSign, Cpu, Trophy } from "lucide-react";
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
  return <h3 className="font-bold text-base mt-5 mb-2 text-gray-900">{children}</h3>;
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

function buildSections(): DocSection[] {
  return [
    {
      id: "what-is-dumfun",
      icon: Rocket,
      title: "What is dum.fun?",
      content: (
        <>
          <Heading>Launch tokens, earn points, climb seasons</Heading>
          <P>
            dum.fun is a Solana devnet token launchpad with bonding curves, auto-created token pages, quest-based points, a leaderboard, and Raydium migration when liquidity graduates.
          </P>
          <Table
            headers={["Feature", "Description"]}
            rows={[
              ["Token Launchpad", "Create SPL tokens with bonding curve pricing — free and instant"],
              ["Token Pages", "Each token has live trading, stats, and prediction markets"],
              ["Quests & Points", "Earn points through trading, launches, and daily activity"],
              ["Seasonal Leaderboard", "Compete in Season 1: Genesis for points recognition"],
              ["Raydium Migration", "Tokens can graduate to Raydium once liquidity thresholds are hit"],
            ]}
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
            Network: Solana Devnet (testnet — no real money)
          </div>
        </>
      ),
    },
    {
      id: "current-status",
      icon: Shield,
      title: "Current Project Status",
      content: (
        <>
          <P>
            The app is live on devnet with real wallet connections, token creation, trading, quests, OG Card claims, and leaderboard tracking.
          </P>
          <Table
            headers={["Feature", "Status"]}
            rows={[
              ["Wallet connect", "✅ Live"],
              ["Token launch", "✅ Live"],
              ["Bonding curve trading", "✅ Live"],
              ["Prediction markets on token pages", "✅ Live"],
              ["Quests & points", "✅ Live"],
              ["OG Card free claim", "✅ Live"],
              ["Season 1: Genesis leaderboard", "✅ Live"],
              ["Standalone prediction hub", "❌ Removed"],
            ]}
          />
        </>
      ),
    },
    {
      id: "how-it-works",
      icon: Zap,
      title: "How It Works",
      content: (
        <>
          <Heading>Launching a Token</Heading>
          <Ol items={[
            "Connect your Phantom wallet",
            "Open Create and fill in token details",
            "Sign the transaction to deploy on-chain",
            "Your token is live with a bonding curve and market page",
          ]} />
          <Heading>Trading Tokens</Heading>
          <P>
            Tokens use a bonding curve for price discovery. As buys come in, price rises. At the graduation threshold, the token can migrate to Raydium.
          </P>
          <Heading>Prediction Markets</Heading>
          <P>
            Prediction markets now live inside individual token pages only. There is no standalone prediction hub.
          </P>
        </>
      ),
    },
    {
      id: "points-tiers",
      icon: Trophy,
      title: "Points, Tiers & Seasons",
      content: (
        <>
          <P>
            Points come from quests, trading, token creation, and seasonal activity. The OG Card gives a permanent 1.2x multiplier.
          </P>
          <Table
            headers={["Tier", "Points Required"]}
            rows={[
              ["Fresh Pill", "0"],
              ["Curve Rider", "500"],
              ["Full Degen", "2,000"],
              ["Diamond Hands", "5,000"],
              ["On-Chain God", "10,000+"],
            ]}
          />
          <P>
            Season 1 is called <strong>Genesis</strong>. We’re not announcing prize amounts yet, so the leaderboard should be read as points-based competition first.
          </P>
        </>
      ),
    },
    {
      id: "fees",
      icon: DollarSign,
      title: "Fees",
      content: (
        <>
          <Table
            headers={["Fee Type", "Amount", "Notes"]}
            rows={[
              ["Token Creation", "0.05 SOL", "One-time fee to launch a token"],
              ["Trading Fee", "1%", "Applied to bonding curve swaps"],
              ["Betting Fee", "2%", "Applied to token-page prediction bets"],
            ]}
          />
          <P>
            Fees support the platform and future development. Exact seasonal rewards are not locked in yet.
          </P>
        </>
      ),
    },
    {
      id: "integrations",
      icon: Cpu,
      title: "Integrations",
      content: (
        <>
          <P>
            dum.fun uses live Solana infrastructure and wallet integrations.
          </P>
          <Table
            headers={["Integration", "What It Does"]}
            rows={[
              ["Helius RPC", "Fast Solana network access"],
              ["Phantom Wallet", "Wallet connection and signing"],
              ["Raydium", "Graduated token liquidity"],
              ["Token-2022", "Advanced token support"],
            ]}
          />
        </>
      ),
    },
    {
      id: "faq",
      icon: HelpCircle,
      title: "FAQ",
      content: (
        <>
          <Heading>Common Questions</Heading>
          <Ul items={[
            "Prediction markets are only on individual token pages.",
            "The OG Card is free and gives 1.2x points.",
            "Season 1 is Genesis; rewards are not finalized publicly.",
            "The app is currently on Solana devnet.",
          ]} />
        </>
      ),
    },
  ];
}

const faqs = [
  { q: "How do I connect my wallet?", a: "Click the login button in the header and connect Phantom." },
  { q: "Is the OG Card free?", a: "Yes. It gives a 1.2x points multiplier." },
  { q: "Where are prediction markets?", a: "Inside each token page only." },
  { q: "Are season rewards announced?", a: "Not yet. Season 1 is Genesis and points are the current focus." },
  { q: "Is dum.fun on mainnet?", a: "No, the app is currently on Solana devnet." },
];

export default function DocsPage() {
  usePageTitle("/docs");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const sections = buildSections();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-black text-gray-900">Documentation</h1>
          </div>
          <p className="mt-1 text-gray-600">Current product overview, how it works, and what’s live today.</p>
        </motion.div>

        <nav className="rounded-xl p-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-bold text-sm mb-3 uppercase tracking-wider text-gray-400">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 border border-gray-200">
                {section.title}
              </a>
            ))}
            <a href="#faq" className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 border border-gray-200">
              FAQ
            </a>
          </div>
        </nav>

        <div className="space-y-5">
          {sections.map((section, index) => (
            <motion.section key={section.id} id={section.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.3) }} className="rounded-xl p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100">
                  <section.icon className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-black text-gray-900">{section.title}</h2>
              </div>
              <div>{section.content}</div>
            </motion.section>
          ))}
        </div>

        <motion.section id="faq" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-yellow-100">
              <HelpCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-black text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-1">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-lg overflow-hidden border border-gray-100">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${expandedFaq === index ? "bg-red-50" : "hover:bg-gray-50"}`}
                  data-testid={`faq-toggle-${index}`}
                >
                  <span className="font-bold text-sm text-gray-900">{faq.q}</span>
                  <motion.span animate={{ rotate: expandedFaq === index ? 180 : 0 }} className="text-xs text-gray-400">▼</motion.span>
                </button>
                {expandedFaq === index && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-4 pb-3 text-sm text-gray-600">
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </Layout>
  );
}
