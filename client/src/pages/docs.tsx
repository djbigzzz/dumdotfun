import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Book, Zap, TrendingUp, Coins, HelpCircle, Shield, Rocket, DollarSign, Lock, Eye } from "lucide-react";

const sections = [
  {
    id: "devnet-status",
    icon: Shield,
    title: "Platform Status",
    content: `**dum.fun is live on Solana Devnet**

Deploy real SPL tokens on Solana devnet with integrated prediction markets.

**Current Features:**
- ✅ Real on-chain token creation on Solana devnet
- ✅ Phantom wallet connection and signing
- ✅ Wallet balance display with airdrop
- ✅ Token listings and details
- ✅ Prediction markets on every token
- ✅ Betting with virtual currency

**Coming Soon:**
- Solana mainnet deployment
- Live bonding curve smart contract
- Real SOL transactions
- Token graduation to Raydium DEX`
  },
  {
    id: "what-is-dumfun",
    icon: Zap,
    title: "What is dum.fun?",
    content: `dum.fun is a Solana-based token launchpad with integrated prediction markets. Unlike other launchpads, every token launched here automatically gets prediction markets attached - so you can bet on whether a token will moon, graduate to DEX, or if the dev will rug.

We combine meme token culture with real prediction market functionality. Think pump.fun meets Kalshi, but for degens.`
  },
  {
    id: "how-it-works",
    icon: Rocket,
    title: "How Does It Work?",
    content: `**Launching a Token:**
1. Connect your Phantom wallet
2. Fill in token details (name, symbol, description, image)
3. Pay the 0.05 SOL creation fee
4. Your token is live with a bonding curve!

**Trading Tokens:**
Tokens start on a bonding curve - early buyers get lower prices. As more people buy, the price increases. When the bonding curve fills (reaches graduation threshold), the token "graduates" to a DEX with real liquidity.

**Prediction Markets:**
Every token automatically gets prediction markets. Bet YES or NO on outcomes like:
- Will the token graduate to DEX?
- Will it hit 1M market cap?
- Will the dev rug?

If you're right, you profit. If you're wrong, you lose your bet.`
  },
  {
    id: "bonding-curve",
    icon: TrendingUp,
    title: "Bonding Curve Explained",
    content: `The bonding curve is a mathematical formula that determines token price based on supply.

**How it works:**
- When you buy tokens, the price goes UP
- When you sell tokens, the price goes DOWN
- Early buyers get cheaper prices
- The more tokens sold, the higher the price

**Graduation:**
When enough tokens are purchased and the bonding curve reaches its threshold, the token "graduates" to a real DEX (like Raydium) with actual liquidity. This is the goal for most tokens.

**Why bonding curves?**
They create fair, transparent pricing without needing initial liquidity. Anyone can launch a token with just 0.05 SOL.`
  },
  {
    id: "prediction-markets",
    icon: Coins,
    title: "Prediction Markets",
    content: `Every token on dum.fun comes with prediction markets - questions you can bet on.

**How betting works:**
- Each market has YES and NO sides
- You buy shares of the outcome you believe in
- Prices reflect the crowd's probability estimate
- If you're correct, your shares pay out $1 each
- If you're wrong, your shares are worth $0

**Example:**
"Will $DOGE graduate to DEX?"
- YES is trading at 30¢ (crowd thinks 30% chance)
- You buy 100 YES shares for $30
- If it graduates, you get $100 (profit: $70)
- If it doesn't, you get $0 (loss: $30)

**DFlow Integration:**
We're integrating with DFlow to bring Kalshi prediction market liquidity on-chain. This means real, regulated prediction markets on Solana.`
  },
  {
    id: "fees",
    icon: DollarSign,
    title: "Platform Fees",
    content: `**Token Creation:** 0.05 SOL
One-time fee to launch your token on the platform.

**Prediction Market Creation:** 0.05 SOL
Create custom prediction markets for any token.

**Trading Fee:** 1%
Applied to all bonding curve trades (buying and selling tokens).

**Betting Fee:** 2%
Applied to prediction market bets.

All fees go to the platform treasury to fund development and liquidity.`
  },
  {
    id: "safety",
    icon: Shield,
    title: "Safety & Trading",
    content: `**Trading involves significant risk. Always DYOR.**

Dum.fun is a platform for meme tokens and prediction markets. All tokens are launched on Solana Devnet.

**Safety Features:**
- Real-time bonding curve tracking
- Transparent token supply data
- Verified creator wallet display`
  }
];

const faqs = [
  {
    q: "How do I connect my wallet?",
    a: "Click the 'LOG IN' button and select Phantom. Make sure you have the Phantom browser extension installed."
  },
  {
    q: "What wallet do I need?",
    a: "Currently only Phantom wallet is supported. We plan to add more wallets in the future."
  },
  {
    q: "How much SOL do I need to launch a token?",
    a: "You need 0.05 SOL for the creation fee, plus a small amount for transaction fees (usually less than 0.01 SOL)."
  },
  {
    q: "Can I change my token after launching?",
    a: "No. Token name, symbol, and supply are permanent once created. Only social links can be updated."
  },
  {
    q: "What happens when a token graduates?",
    a: "When the bonding curve fills, liquidity is automatically migrated to a DEX (like Raydium) and trading continues there."
  },
  {
    q: "How do prediction market odds work?",
    a: "Odds are determined by the ratio of YES to NO bets. If more people bet YES, YES becomes more expensive (higher probability)."
  },
  {
    q: "When do prediction markets resolve?",
    a: "Markets resolve when the outcome is determined (e.g., token graduates or fails to graduate by a certain date)."
  },
  {
    q: "Is dum.fun safe?",
    a: "Trading experimental meme tokens involves high risk. This platform is for testing on Solana Devnet. Never trade more than you can afford to lose."
  }
];

export default function DocsPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-black text-gray-900">Documentation</h1>
          </div>
          <p className="text-gray-600">
            Everything you need to know about dum.fun
          </p>
        </motion.div>

        <nav className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="font-bold text-gray-900 mb-3">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-3 py-1.5 bg-gray-100 border border-black rounded-lg text-sm font-medium hover:bg-red-100 hover:text-red-600 transition-colors"
              >
                {section.title}
              </a>
            ))}
            <a
              href="#faq"
              className="px-3 py-1.5 bg-gray-100 border border-black rounded-lg text-sm font-medium hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              FAQ
            </a>
          </div>
        </nav>


        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg border border-red-200">
                  <section.icon className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-black text-gray-900">{section.title}</h2>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700">
                {section.content.split('\n\n').map((paragraph, i) => (
                  <div key={i} className="mb-4">
                    {paragraph.split('\n').map((line, j) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <h3 key={j} className="font-bold text-gray-900 mt-4 mb-2">
                            {line.replace(/\*\*/g, '')}
                          </h3>
                        );
                      }
                      if (line.startsWith('**')) {
                        const parts = line.split('**');
                        return (
                          <p key={j} className="mb-1">
                            <strong>{parts[1]}</strong>{parts[2]}
                          </p>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={j} className="ml-4 list-disc">
                            {line.substring(2)}
                          </li>
                        );
                      }
                      if (line.match(/^\d\./)) {
                        return (
                          <li key={j} className="ml-4 list-decimal">
                            {line.substring(3)}
                          </li>
                        );
                      }
                      return line ? <p key={j}>{line}</p> : null;
                    })}
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        <motion.section
          id="faq"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-100 rounded-lg border border-yellow-200">
              <HelpCircle className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <div className="text-center py-8 text-gray-500 text-sm">
          <p>Still have questions? DM us on X: <a href="https://x.com/dumdotfun" target="_blank" rel="noopener noreferrer" className="text-red-500 font-bold hover:underline">@dumdotfun</a></p>
        </div>
      </div>
    </Layout>
  );
}
