# 🔒 dum.fun - Privacy-First Solana Token Launchpad

> **Zero-Knowledge Payments Meet Meme Tokens** — Built for [Solana Privacy Hack 2026](https://solana.com/privacyhack)

**A comprehensive privacy infrastructure for Solana featuring 8 integrated privacy protocols, real on-chain token launches, and confidential prediction markets.**

---

## 🎥 Demo & Live Deployment

- **🌐 Live on Devnet**: [dum.fun](https://dum-fun.replit.app) *(Running on Solana Devnet)*
- **📊 Contract Explorer**: [View on Solscan](https://solscan.io/account/6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh?cluster=devnet)
- **💻 Source Code**: Open source under MIT License

---

## 📖 For Judges

**[HACKATHON.md](HACKATHON.md)** - All 9 bounties, verification commands, on-chain proofs

Quick test: Connect Phantom (Devnet) → Privacy Hub → Place confidential bet

---

## 💡 The Problem

**Traditional blockchain payments are completely transparent.**

When you pay someone on Solana, Ethereum, or Bitcoin:
- ❌ **Everyone** can see the exact amount
- ❌ Competitors know your salary rates
- ❌ Your financial history is public forever
- ❌ Privacy is impossible without centralized solutions

**For job marketplaces**, this creates serious problems:
- Workers don't want their salaries exposed
- Employers don't want to reveal what they pay
- Freelancers lose negotiating power
- GDPR compliance is nearly impossible

**Existing solutions** fall short:
- Centralized mixers can steal your funds
- Monero/Zcash require separate chains
- Ethereum privacy solutions have $10-50 gas fees
- No production-ready privacy on Solana... until now

---

## ✨ Our Solution

**dum.fun** is a **token launchpad + prediction market platform** with **enterprise-grade privacy built into every layer**.

We've integrated **8 different privacy protocols** from the Solana ecosystem into a single, cohesive platform where:

✅ **ShadowWire Bulletproofs** hide transfer amounts with zero-knowledge proofs
✅ **Token-2022 Confidential Transfers** encrypt balances on-chain
✅ **Stealth Addresses** make receiving tokens unlinkable
✅ **Privacy Cash SDK** breaks on-chain payment links
✅ **Arcium MPC** enables confidential smart contract execution
✅ **Inco Lightning** provides confidential betting in prediction markets
✅ **Privacy Pools** anonymize senders through mixing
✅ **AI Agent Markets** create prediction markets autonomously

**The result?** On-chain privacy for transfers via **ShadowWire** (amounts hidden with ZK proofs), unlinkable receiving via **stealth addresses**, and **confidential betting** via Inco commitments — all on Solana with sub-second finality.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      dum.fun Platform                           │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Token Launchpad│  │ Prediction     │  │ Privacy Hub      │  │
│  │ • Bonding curve│  │ Markets        │  │ • 8 integrations │  │
│  │ • Real SPL     │  │ • Confidential │  │ • Unified UI     │  │
│  │ • 1% platform  │  │   betting      │  │ • Activity log   │  │
│  │   fee          │  │ • AI agents    │  │ • Pool mgmt      │  │
│  └────────┬───────┘  └───────┬────────┘  └────────┬─────────┘  │
│           │                  │                     │            │
│           └──────────────────┴─────────────────────┘            │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                    Privacy Layer (8 Protocols)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ShadowWire   │  │ Token-2022   │  │ Stealth Addr │          │
│  │ Bulletproofs │  │ Confidential │  │ Anoncoin     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Privacy Cash │  │ Arcium MPC   │  │ Inco         │          │
│  │ SDK          │  │ C-SPL        │  │ Lightning    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Privacy Pool │  │ PNP AI       │                            │
│  │ Authority    │  │ Agents       │                            │
│  └──────────────┘  └──────────────┘                            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     Solana Blockchain (Devnet)                  │
│                                                                 │
│  • Helius RPC for all connections                               │
│  • Real SPL token creation                                      │
│  • On-chain bonding curve program                               │
│  • Phantom wallet integration                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. **Token Launchpad** (Production Ready)
- ✅ Real SPL token creation on Solana Devnet
- ✅ Bonding curve price discovery (0 → 85 SOL)
- ✅ Market cap tracking & token graduation
- ✅ 1% platform trading fee
- ✅ WebSocket real-time price updates via PumpPortal

### 2. **Prediction Markets** (With Privacy)
- ✅ Binary YES/NO outcome betting
- ✅ **Confidential betting** — amounts encrypted using Inco Lightning SDK
- ✅ Pool-based liquidity with automatic settlement
- ✅ AI agent market creation using LLMs

### 3. **Privacy Infrastructure** (8 Integrations)

#### **ShadowWire (Radr) — $15K Bounty Target**
- **Bulletproof zero-knowledge proofs** for hidden transfer amounts
- **22 token support** (SOL, RADR, USDC, BONK, etc.)
- **Two privacy modes:**
  - Internal: Amount hidden, parties visible
  - External: Sender anonymous, amount visible
- **Client-side WASM proof generation**
- **~20ms on-chain verification, 672-byte proofs**

#### **Token-2022 Confidential Transfers — $15K Bounty Target**
- **Pedersen commitments** for balance encryption
- **Range proofs** for amount validation
- **Hybrid strategy:** Works today (fallback mode), auto-upgrades to v0.5.x+
- **Zero code changes** required for future API

#### **Stealth Addresses (Anoncoin) — $10K Bounty Target**
- **One-time receive addresses** — unlinkable to your main wallet
- **View tag optimization** for efficient transaction scanning
- **Ephemeral keys** prevent address reuse
- **Sweep functionality** to claim received funds

#### **Privacy Cash SDK — $15K Prize Pool**
- **Private deposits/withdrawals** that break on-chain links
- **Nullifier scheme** prevents double-spending
- **Multi-token support** (SOL, USDC, USDT)

#### **Arcium C-SPL (MPC) — $10K Bounty Target**
- **Multi-Party Computation** for confidential DeFi
- **Hidden balances during computation**
- **Program ID:** `Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX`

#### **Inco Lightning SDK — $2K Bounty Target**
- **Confidential betting** with client-side encryption
- **Commitment scheme:** SHA-256(amount:side:nonce:address)
- **Aggregated proofs** for gas efficiency
- **Program ID:** `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`

#### **Privacy Pool Authority (Custom)**
- **On-chain privacy pool** for sender anonymity
- **Internal balance tracking** (no on-chain record)
- **Deposit/withdraw mixing**

#### **PNP Exchange AI Agents — $2.5K Bounty Target**
- **LLM-powered market creation**
- **Autonomous market makers**
- **Natural language market descriptions**

---

## 🏆 Hackathon Bounty Breakdown

**Target: $75,500+ across 9 bounties**

| Sponsor | Bounty | Status | Integration |
|---------|--------|--------|-------------|
| **Radr (ShadowWire)** | $15,000 | ✅ Active | Bulletproof ZK private transfers (22 tokens) |
| **Token-2022** | $15,000 | ✅ Active | Hybrid confidential transfers (fallback + real) |
| **Anoncoin** | $10,000 | ✅ Active | Stealth addresses with view tags |
| **Arcium** | $10,000 | ✅ Active | MPC confidential token operations |
| **Privacy Cash** | $15,000 | ✅ Active | Private deposits/withdrawals |
| **Helius** | $5,000 | ✅ Active | All Solana connections use Helius RPC |
| **Inco Lightning** | $2,000 | ✅ Active | Confidential prediction market betting |
| **PNP Exchange** | $2,500 | ✅ Active | AI agent prediction markets |
| **encrypt.trade** | $1,000 | ✅ Active | Privacy education documentation |

**Why we chose each sponsor tech:**
- **ShadowWire**: Best-in-class Bulletproofs, no trusted setup, production-ready
- **Token-2022**: Future-proof, native Solana, compliance-friendly with auditor keys
- **Anoncoin**: Unlinkability is critical for payment privacy
- **Arcium**: MPC enables confidential smart contracts
- **Privacy Cash**: Proven SDK with OFAC compliance
- **Helius**: Fastest RPC, essential for real-time WebSocket feeds
- **Inco**: Only confidential betting solution on Solana
- **PNP**: AI agents reduce market creation friction

---

## 💻 Technology Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + Shadcn/ui (30+ components) + Phantom wallet
- **Backend**: Express.js + PostgreSQL (Drizzle ORM) + WebSocket real-time + Helius RPC
- **Blockchain**: Solana Devnet + Token-2022 ready + SPL Token SDKs
- **Privacy Crypto**: Bulletproofs (ZK proofs) + Pedersen Commitments + ElGamal + ECDH stealth keys + SHA-256 commitments

**Total codebase**: ~10,000 lines TypeScript (100% type-safe), 2,255 lines privacy implementations

---

## 📦 Deployed Contracts & Addresses

### **Solana Devnet**

| Component | Address | Network |
|-----------|---------|---------|
| **Bonding Curve Program** | `6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh` | Devnet |
| **Platform Authority** | `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM` | Devnet |
| **Fee Recipient** | `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM` | Devnet |
| **Platform Config PDA** | `Eh2U3Es7rHzMx62GFRoGQWfGXXrakd3A3rx5Tk1iAzDB` | Devnet |
| **Inco Lightning Program** | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` | Devnet |
| **Arcium C-SPL Program** | `Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX` | Devnet |

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Helius API key ([free tier](https://helius.dev))

### Environment Variables

```bash
DATABASE_URL=postgresql://...
HELIUS_API_KEY=your-helius-api-key
SOLANA_NETWORK=devnet
```

### Installation

```bash
npm install
npm run db:push
npm run dev
```

Open http://localhost:5000 and connect Phantom wallet (set to Devnet).

---

## 📝 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/privacy/status` | Privacy stack status |
| `GET /api/tokens` | List all tokens |
| `POST /api/tokens` | Create new token |
| `GET /api/markets` | List prediction markets |
| `POST /api/markets/:id/bet` | Place a bet |
| `POST /api/privacy/stealth-address` | Generate stealth address |
| `POST /api/privacy/confidential-transfer` | Create confidential transfer |

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Special thanks to our hackathon sponsors:
- **Radr** for ShadowWire SDK
- **Helius** for RPC infrastructure
- **Inco Network** for Lightning SDK
- **Arcium** for MPC technology
- **Privacy Cash** for deposit/withdrawal SDK

---

## 🔗 Links

- [Solana Privacy Hack](https://solana.com/privacyhack)
- [Helius RPC](https://helius.dev)
- [Inco Network](https://inco.org)
- [Arcium](https://arcium.com)
- [Radr ShadowWire](https://github.com/Radrdotfun/ShadowWire)

---

<div align="center">

**🔒 Privacy is a human right 🔒**

Built with ❤️ for the Solana Privacy Hack 2026

</div>
