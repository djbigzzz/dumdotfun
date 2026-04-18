<div align="center">

# 🎰 dum.fun

### **Launch a token. Bet on whether it survives.**

A neo-brutalist Solana launchpad where every coin ships with its own on-chain prediction market.

[![Devnet](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://explorer.solana.com/?cluster=devnet)
[![Live Demo](https://img.shields.io/badge/Live-dum.fun-14F195?style=for-the-badge&logo=vercel&logoColor=black)](https://dum.fun)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Stack](https://img.shields.io/badge/Built%20with-React%20%2B%20TS%20%2B%20Solana-red?style=for-the-badge)](#-tech-stack)

---

**[🚀 Try the live app](https://dum.fun) · [📜 What it does](#-what-is-dumfun) · [⚡ Features](#-features) · [🛠️ Run locally](#%EF%B8%8F-getting-started) · [🗺️ Roadmap](#%EF%B8%8F-roadmap)**

</div>

---

## 📜 What is dum.fun?

A **pump.fun-style launchpad** with a twist — every token comes paired with an **on-chain prediction market** so the crowd can bet on whether it survives or rugs.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   $TOKEN  ───►  bonding curve  ───►  Raydium @ 85 SOL        │
│      │                                                       │
│      └──►  paired prediction market  ───►  auto-resolve      │
│                  YES / NO bets                on-chain       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Anyone can:

| | |
|---|---|
| 🪙 | Mint a real SPL token on Solana Devnet via a bonding curve |
| 🎯 | Bet SOL on a token's *"will it survive / will it rug"* market |
| ⭐ | Earn points and climb seasonal leaderboards for real SOL rewards |
| 🌊 | Watch tokens auto-graduate to a Raydium CPMM pool at 85 SOL |

> The UI is intentionally loud — neo-brutalist black, red, yellow, green — to make on-chain trading feel like an arcade.

---

## ⚡ Features

### 🚀 Token launchpad
- **Real SPL tokens** on Solana Devnet — no mocks, no demo mode, no shortcuts
- **Bonding-curve pricing** with a fixed 1% platform fee
- **Automatic Raydium CPMM migration** when liquidity hits 85 SOL
- **Pro-grade charts** — OHLC candles, volume bars, and dev-trade bubbles via lightweight-charts

### 🎯 Prediction markets
- Every token gets a paired market: `Will $TOKEN survive?` / `Will it rug?`
- **Auto-resolved on-chain** by reading dev holdings, supply, liquidity, and graduation status
- **Two-step betting flow** (`prepare-bet` → wallet sign → `confirm-bet`) with on-chain signature verification
- **Self-healing transactions** — if the broadcast says *"already processed"*, the signature is extracted from the signed tx and the bet still completes
- **Polymarket-style discovery** with sort, filter, ending-soon pills, and *"if resolved now"* preview banners
- **No-consensus guard** — when only the creator has seeded the pool, odds collapse to `—` instead of misleading 100/0 numbers

### ⭐ Gamification — Points & Quests v1
| Tier | Points | Name |
|------|-------:|------|
| 🟢 | 0–499 | Fresh Pill |
| 🟡 | 500–1,999 | Curve Rider |
| 🟠 | 2,000–4,999 | Full Degen |
| 🔵 | 5,000–9,999 | Diamond Hands |
| 🟣 | 10,000+ | On-Chain God |

- 10 quests across **onboarding · activity · streaks · special**
- Daily check-in with streak tracking
- **OG Card NFT** mint (0.2 SOL) → permanent **1.5× points multiplier**

### 🏆 Seasonal leaderboards
Arkada-style named seasons. Top 10 win SOL from a per-season pool:

| Rank | Reward |
|:---:|:---:|
| 🥇 #1 | **1.5 SOL** |
| 🥈 #2 | 1.0 SOL |
| 🥉 #3 | 0.75 SOL |
| #4–5 | 0.5 SOL each |
| #6–7 | 0.25 SOL each |
| #8–9 | 0.1 SOL each |
| #10 | 0.05 SOL |

### 🔍 Token-level transparency
- Full holder breakdown + on-chain activity feed
- Dev wallet trade tagging and rug-risk badges
- Token health score from supply, liquidity, holder count, recent activity

### 📱 Mobile
- Capacitor-wrapped Android build for the **Solana dApp Store**
- Saga / mobile wallet adapter support out of the box

---

## 🧱 Tech stack

<table>
<tr>
<td valign="top" width="33%">

**🎨 Frontend**
- React 18 + TypeScript
- Vite + Wouter
- Tailwind v4
- Shadcn/ui (Radix)
- Framer Motion
- Lightweight Charts

</td>
<td valign="top" width="33%">

**⚙️ Backend**
- Express + TypeScript
- WebSockets
- Drizzle ORM
- PostgreSQL
- Zod validation

</td>
<td valign="top" width="33%">

**⛓️ Solana**
- Helius RPC
- `@solana/web3.js`
- `@solana/spl-token`
- Raydium SDK v2
- Phantom + mobile adapter

</td>
</tr>
</table>

**Other services:** Jupiter (SOL price) · CoinGecko (fallback) · Dune SIM API (analytics) · SendGrid (waitlist)

---

## 🛠️ Getting started

### Prerequisites
- **Node 20+**
- A **PostgreSQL** database (Neon works great)
- A **Helius** API key (Devnet)
- **Phantom** wallet on Devnet with some test SOL → [faucet](https://faucet.solana.com)

### Run locally
```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, HELIUS_API_KEY, FEE_RECIPIENT_WALLET
npm run db:push        # apply Drizzle schema
npm run dev            # serves frontend + backend on :5000
```

### Required environment variables

| Variable | Required | Purpose |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `HELIUS_API_KEY` | ✅ | Solana Devnet RPC |
| `FEE_RECIPIENT_WALLET` | ✅ | Receives platform fees *(must differ from your test wallet)* |
| `SESSION_SECRET` | ✅ | Express session signing |
| `SENDGRID_API_KEY` | ⬜ | Waitlist emails |
| `DUNE_API_KEY` | ⬜ | Richer on-chain activity feed |

---

## 🗂️ Project layout

```
📦 dum.fun
 ┣ 📂 client/         React frontend (pages, components, hooks)
 ┣ 📂 server/         Express API · Solana services · auto-resolver · websockets
 ┗ 📂 shared/         Drizzle schema + Zod types shared between client & server
```

**Files worth knowing:**

| File | What it does |
|---|---|
| `shared/schema.ts` | Single source of truth for all data models |
| `server/routes.ts` | Every API endpoint (markets, bets, tokens, points, seasons) |
| `server/services/token-health.ts` | On-chain reads for survival-criteria resolution |
| `server/auto-resolver.ts` | Background loop that closes expired markets |
| `client/src/pages/market.tsx` | Polymarket-style market detail page |
| `client/src/pages/markets.tsx` | Discovery page with sort + filter |
| `client/src/pages/token.tsx` | Token detail with paired market widget |

---

## 🗺️ Roadmap

| Phase | What's shipping |
|---|---|
| ✅ **Now** | Devnet launchpad, prediction markets, points + seasons, Raydium auto-migration |
| 🔜 **Next** | Challenge windows / tentative resolutions · slimmer create-market UX · mainnet readiness audit |
| 🎯 **Colosseum Frontier 2026** *(May 12)* | Confidential betting via **Encrypt FHE** + **Ika dWallets** — bet amounts hidden until resolution |
| 🌅 **Later** | Full mainnet launch · on-chain governance · secondary markets |

---

## 🤝 Contributing

Issues and PRs welcome. Please:

1. Open an issue describing the change before large refactors
2. Run `npm run check` (typecheck) before submitting
3. Keep `data-testid` attributes on every interactive element

---

<div align="center">

## 📄 License

**MIT** — do whatever you want, just don't blame us when memes happen.

---

Made with 🎰 on Solana · Built for degens, by degens

</div>
