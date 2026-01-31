import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Book, Zap, TrendingUp, Coins, HelpCircle, Shield, Rocket, DollarSign, Lock, Eye, Cpu, Trophy } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

const sections = [
  {
    id: "what-is-dumfun",
    icon: Rocket,
    title: "What is dum.fun?",
    content: `**The Privacy-First Meme Token Launchpad**

dum.fun is a token launchpad where you can create and trade meme tokens on Solana — with built-in privacy features that protect your trading activity.

**Core Features:**

| Feature | Description |
|---------|-------------|
| Token Launchpad | Create SPL tokens with bonding curve pricing |
| Prediction Markets | Bet on whether tokens will succeed |
| Privacy Mode | Hide your bet amounts and trading activity |
| Stealth Addresses | Receive tokens without revealing your wallet |

**How It Works:**

1. **Connect Phantom Wallet** - Click "LOG IN" in header
2. **Get Devnet SOL** - Use the airdrop button (we're on Solana devnet)
3. **Launch a Token** - Go to Launch, fill in details, deploy on-chain
4. **Trade on Bonding Curve** - Buy and sell tokens with automatic pricing
5. **Enable Privacy Mode** - Click the 👁 toggle for encrypted betting
6. **Bet on Predictions** - Each token has prediction markets you can bet on

**Network:** Solana Devnet (testnet - no real money)`
  },
  {
    id: "why-privacy",
    icon: Eye,
    title: "Why Privacy Matters",
    content: `**Your Wallet is a Public Diary**

Every Solana transaction you make is permanently recorded on a public blockchain. Anyone can see:
- Your entire transaction history
- Every token you've ever bought or sold
- Your wallet balance and holdings
- Who you've sent money to and received from

**Real Consequences of Surveillance:**

🔍 **Wallet Tracking Services** analyze millions of wallets to identify "whales" and track their moves. When you buy a token, bots can front-run your trades.

💰 **Employers & Tax Authorities** can link your wallet to your identity through exchange KYC records, seeing every degen play you've made.

🎯 **Hackers & Scammers** target wallets with large balances. Your wealth is visible to everyone.

🏢 **Corporations** build profiles on crypto users, selling your on-chain behavior to advertisers.

**Privacy is Not About Hiding Bad Behavior**

Privacy is about:
- 🛡️ **Personal Safety** - Protecting yourself from targeted attacks
- 💼 **Business Confidentiality** - Keeping trading strategies private
- 🔐 **Financial Freedom** - Transacting without surveillance capitalism
- 🌍 **Human Rights** - A fundamental right recognized by the UN

**What We're Building**

dum.fun integrates privacy-preserving technologies so you can:
- Launch tokens without revealing your main wallet
- Bet on predictions with encrypted amounts
- Receive tokens at stealth addresses nobody can trace
- Trade without exposing your strategy

**Privacy is a right. Anonymity is power.**`
  },
  {
    id: "surveillance-explained",
    icon: Eye,
    title: "Understanding Wallet Surveillance",
    content: `**How You're Being Tracked**

**1. Block Explorers**
Every transaction you make is indexed and searchable. Sites like Solscan, SolanaFM, and others make it trivial to:
- View your complete wallet history
- See every token you hold
- Track every address you interact with

**2. On-Chain Analytics Companies**
Companies like Chainalysis, Elliptic, and TRM Labs:
- Build identity graphs linking wallets to real people
- Sell data to governments, exchanges, and institutions
- Use machine learning to de-anonymize transactions

**3. MEV Bots & Front-Runners**
- Monitor pending transactions in the mempool
- Front-run large trades for profit
- Extract value from your transactions

**4. Exchange Data Sharing**
- KYC data links your identity to deposit addresses
- Exchanges share data with analytics companies
- Your entire on-chain history becomes linked to your name

**Simple Privacy Best Practices:**

✅ Use different wallets for different purposes
✅ Utilize stealth addresses for receiving funds
✅ Enable confidential transfers when available
✅ Break on-chain links with privacy tools
✅ Don't reuse addresses unnecessarily

**dum.fun Privacy Tools:**
- Stealth Addresses for unlinkable receiving
- Confidential betting with encrypted amounts
- Token-2022 confidential transfers
- Privacy mode for cypherpunk aesthetics`
  },
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
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy Features",
    content: `**Your Trading Activity, Your Business**

dum.fun integrates multiple privacy technologies so you can trade without exposing your strategy.

**Confidential Betting**
- 🔒 Your bet amounts are encrypted — nobody can see how much you wagered
- 📝 Uses SHA-256 commitment scheme for cryptographic privacy
- ⚡ Bets are still verified on-chain, just hidden from observers

**Stealth Addresses**
- 🕵️ Generate one-time receive addresses for each transfer
- 🔗 Payments are unlinkable — nobody can trace your holdings back to you
- 🏷️ Only you can detect and claim funds sent to your stealth addresses

**Confidential Transfers**
- 💳 Hidden transfer amounts using Pedersen commitments
- 🔐 Range proofs verify amounts without revealing them
- ✅ Built on Token-2022, Solana's native token standard

**How to Use:**
1. Enable "Private Mode" toggle (👁 icon in header)
2. Bet amounts are automatically encrypted
3. Generate stealth addresses in your Profile
4. All transactions maintain your financial privacy`
  },
  {
    id: "integrations",
    icon: Cpu,
    title: "Platform Integrations",
    content: `**Built on Cutting-Edge Privacy Tech**

dum.fun integrates 7 privacy protocols from the Solana ecosystem:

**Confidential Betting (Inco Lightning)**
- Encrypted bet amounts using zero-knowledge proofs
- Nobody can see how much you wagered

**Stealth Addresses (Anoncoin)**
- One-time receive addresses for private token receiving
- Unlinkable — nobody can trace your holdings

**Confidential Transfers (Token-2022)**
- Hidden transfer amounts using Pedersen commitments
- Built on Solana's native token standard

**Private Deposits (Privacy Cash)**
- Break on-chain links between deposits and withdrawals
- Zero-knowledge proofs for full privacy

**ZK Transfers (ShadowWire)**
- Hidden transfer amounts using Bulletproofs
- 22 supported tokens (SOL, USDC, etc.)

**AI Prediction Markets (NP Exchange)**
- AI-powered market creation
- Bonding curve pricing without orderbooks

**Infrastructure (Helius RPC)**
- Enterprise-grade Solana connections
- Real-time transaction processing`
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
  const { privateMode } = usePrivacy();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
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

        <nav className={`border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
          privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50" : "bg-white"
        }`}>
          <h2 className={`font-bold mb-3 ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
            {privateMode ? "> NAV_LINKS" : "Quick Links"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`px-3 py-1.5 border border-black rounded-lg text-sm font-medium transition-colors ${
                  privateMode 
                    ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/10 font-mono" 
                    : "bg-gray-100 text-gray-900 hover:bg-red-100 hover:text-red-600"
                }`}
              >
                {privateMode ? section.title.toUpperCase().replace(/\s/g, '_') : section.title}
              </a>
            ))}
            <a
              href="#faq"
              className={`px-3 py-1.5 border border-black rounded-lg text-sm font-medium transition-colors ${
                privateMode 
                  ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/10 font-mono" 
                  : "bg-gray-100 text-gray-900 hover:bg-red-100 hover:text-red-600"
              }`}
            >
              {privateMode ? "FAQ_INDEX" : "FAQ"}
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
              className={`border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50" : "bg-white"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg border ${
                  privateMode ? "bg-black border-[#4ADE80]/30" : "bg-red-100 border-red-200"
                }`}>
                  <section.icon className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-red-600"}`} />
                </div>
                <h2 className={`text-xl font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
                  {privateMode ? section.title.toUpperCase().replace(/\s/g, '_') : section.title}
                </h2>
              </div>
              <div className={`prose prose-sm max-w-none ${privateMode ? "prose-invert font-mono text-[#4ADE80]/80" : "text-gray-700"}`}>
                {section.content.split('\n\n').map((paragraph, i) => (
                  <div key={i} className="mb-4">
                    {paragraph.split('\n').map((line, j) => {
                      const renderTextWithBold = (text: string) => {
                        const parts = text.split(/\*\*([^*]+)\*\*/g);
                        return parts.map((part, idx) => 
                          idx % 2 === 1 
                            ? <strong key={idx} className={privateMode ? "text-white" : "font-semibold"}>{part}</strong>
                            : part
                        );
                      };
                      
                      if (line.startsWith('**') && line.endsWith('**') && line.split('**').length === 3) {
                        const text = line.replace(/\*\*/g, '');
                        return (
                          <h3 key={j} className={`font-bold mt-4 mb-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                            {privateMode ? `[ ${text.toUpperCase()} ]` : text}
                          </h3>
                        );
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <li key={j} className="ml-4 list-disc">
                            {renderTextWithBold(line.substring(2))}
                          </li>
                        );
                      }
                      if (line.match(/^\d+\./)) {
                        const numEnd = line.indexOf('.') + 1;
                        return (
                          <li key={j} className="ml-4 list-decimal">
                            {renderTextWithBold(line.substring(numEnd).trim())}
                          </li>
                        );
                      }
                      if (line.includes('**')) {
                        return <p key={j} className="mb-1">{renderTextWithBold(line)}</p>;
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
          className={`border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
            privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50" : "bg-white"
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg border ${
              privateMode ? "bg-black border-[#4ADE80]/30" : "bg-yellow-100 border-yellow-200"
            }`}>
              <HelpCircle className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-yellow-600"}`} />
            </div>
            <h2 className={`text-xl font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
              {privateMode ? "QUERY_DATABASE_FAQS" : "Frequently Asked Questions"}
            </h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className={`border-b pb-4 last:border-0 ${privateMode ? "border-[#4ADE80]/20" : "border-gray-200"}`}>
                <h3 className={`font-bold mb-2 ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                  {privateMode ? `> ${faq.q.toUpperCase()}` : faq.q}
                </h3>
                <p className={`text-sm ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"}`}>{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <div className={`text-center py-8 text-sm ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-500"}`}>
          <p>Still have questions? DM us on X: <a href="https://x.com/dumdotfun" target="_blank" rel="noopener noreferrer" className={`font-bold hover:underline ${privateMode ? "text-white" : "text-red-500"}`}>@dumdotfun</a></p>
        </div>
      </div>
    </Layout>
  );
}
