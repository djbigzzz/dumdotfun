<div align="center">

<img src="https://dum.fun/opengraph.png" alt="Dum.fun" width="100%" />

# 💊 Dum.fun

### *A Solana devnet token launchpad with built-in prediction markets*

**Launch a meme. Bet on its fate. Graduate to Raydium.**

[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

🌐 **[Live demo →](https://dum.fun)** &nbsp;·&nbsp; 📱 **Android via Capacitor** &nbsp;·&nbsp; 🏆 **Built for Solana Colosseum Frontier**

</div>

---

## 🎯 What it does

Dum.fun lets anyone launch a meme token on Solana in **seconds**, trade it on a bonding curve, and bet on its survival in a built-in prediction market. Successful tokens automatically graduate to a Raydium CPMM pool for permanent liquidity.

> *Devnet meme season is real.* 🚀

### ✨ Core features

| | |
|---|---|
| 🚀 | **One-click token launch** with bonding curve pricing (PumpFun-style) |
| 🎯 | **Prediction markets** on every token — *Will it rug? Will it graduate?* |
| 🌊 | **Automatic Raydium graduation** when a token hits the bonding cap |
| 🛡️ | **Confidential payouts** for prediction winners via Cloak (UTXO shielded) |
| 🏆 | **Gamified points + quests + seasonal leaderboard** with SOL rewards |
| 📡 | **Real-time activity feed** via WebSockets |
| 📈 | **TradingView OHLC candlestick charts** for every token |
| 📱 | **Mobile-native Android app** with Solana Mobile + Saga wallet |
| 🌐 | **SNS .sol name resolution** across all wallet displays |
| ✨ | **Vanity mint addresses** ground out for tokens *(every mint ends in `dum`)* |

---

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| 🎨 **Frontend** | React 18, TypeScript, Vite, Wouter, Tailwind CSS v4, Shadcn/ui (Radix), Framer Motion |
| ⚙️ **Backend** | Express.js, TypeScript, WebSockets, Node 20 |
| 🗄️ **Database** | PostgreSQL via Prisma ORM |
| ⛓️ **Blockchain** | Solana Devnet, Helius RPC, custom bonding curve program, Raydium SDK v2 |
| 🔐 **Privacy** | Cloak Protocol (shielded UTXO payouts) |
| 📊 **Analytics** | Dune Sim API for on-chain wallet history |
| ✉️ **Email** | SendGrid for waitlist + transactional |
| 📱 **Mobile** | Capacitor (Android), Solana Mobile Stack, Saga wallet adapter |

---

## 🏆 Hackathon track integrations — Colosseum Frontier 2026

This repo targets multiple Frontier Hackathon tracks. Each integration is **real**, on-chain (where applicable), and reachable from the live app — no mocks, no stubs.

| Track | Prize | What we built |
|---|---|---|
| 🥷 **Umbra Privacy Track** | $10,000 | Private prediction-market payouts via `@umbra-privacy/sdk` — winners shield winnings into an encrypted balance with a one-click claim card on the market page |
| 🛡️ **Cloak Privacy Track** | $5,000 | UTXO-based shielded payouts via `@cloak.dev/sdk-devnet` — real Groth16 ZK proofs against the Cloak devnet program |
| 📊 **Dune SIM API Track** | $6K SIM Enterprise | Live on-chain wallet activity panel + token analytics on every profile and token page |
| 🌐 **SNS Identity Track** | $1,800 | Forward + reverse `.sol` resolution against the SNS mainnet program — every wallet on the platform shows its `.sol` name |
| 🎓 **100xDevs Side Track** | $2,500 | Full-stack Solana product built end-to-end during the cohort |

**Other sponsor infrastructure we rely on:** Helius RPC (all on-chain reads/writes + webhooks), Raydium SDK v2 (automated CPMM graduation), Solana Mobile Stack (native Android + Mobile Wallet Adapter), SendGrid (transactional email).

---

## 📦 Repository scope

This is a **single full-stack monorepo** containing the entire dum.fun product. No separate frontend or backend repos. All Solana interactions target **devnet only** — no mainnet deployment yet. Mobile app builds from this same repo via Capacitor.

```
📂 dumdotfun/
 ├── 🎨 client/        React + Vite SPA
 ├── ⚙️ server/        Express API, WebSockets, background jobs
 ├── 🗄️ prisma/        PostgreSQL schema (Prisma ORM)
 ├── 📱 android/       Capacitor Android shell
 ├── 🛠️ scripts/       Deploy + migration helpers
 └── 🔗 shared/        Types shared between client and server
```

---

## 🗺️ Where things live

- 🛣️ **API routes:** `server/routes.ts`
- 📈 **Bonding curve client:** `server/bonding-curve-client.ts`
- 🌊 **Raydium graduation:** `server/services/graduation.ts`, `server/services/raydium-swap.ts`
- 💰 **Prediction payouts:** `server/services/market-payouts.ts`
- 🔐 **Cloak privacy:** `server/cloak.ts`, `client/src/components/cloak-shield-button.tsx`
- 🔄 **Token reconciler:** `server/services/token-reconciler.ts`
- 🧩 **UI components:** `client/src/components/`
- 📄 **Pages:** `client/src/pages/` *(token, market, profile, ranks, quests, etc.)*
- 🎨 **Theme & styling:** `client/tailwind.config.ts`

---

## 🚀 Run locally

### 📋 Requirements
- 🟢 Node 20+
- 🐘 PostgreSQL database
- 🌅 Helius API key (devnet)

### ⚡ Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npx prisma db push
npm run dev
```

App goes live at 👉 `http://localhost:5000`

### 🔑 Required environment variables

```env
DATABASE_URL=postgres://...
HELIUS_API_KEY=...
PLATFORM_AUTHORITY_SECRET_KEY=...   # base58 secret, prediction payouts
FEE_RECIPIENT_WALLET=...            # SOL address that receives platform fees
SENDGRID_API_KEY=...                # optional — waitlist emails
DUNE_API_KEY=...                    # optional — on-chain wallet panel
```

---

## 📜 Scripts

| Command | What it does |
|---|---|
| 🏃 `npm run dev` | Start the full app (Express + Vite) on port 5000 |
| 📦 `npm run build` | Production build |
| ✅ `npm run typecheck` | TypeScript check |
| 🔄 `npx prisma db push` | Sync Prisma schema to the database |
| 🔍 `npx prisma studio` | Visual DB browser |

---

## 🥷 Umbra Privacy Integration

Winners of prediction markets can shield their payout into an Umbra **encrypted balance** so the
amount and recipient stay off the public ledger. The flow uses the official `@umbra-privacy/sdk`
+ `@umbra-privacy/web-zk-prover` packages — no fork, no custom protocol code.

```
Server (services/umbra-payouts.ts)               Browser (pages/market.tsx)
─────────────────────────────────                ──────────────────────────
getPublicBalanceToReceiverClaimable      ──→     getReceiverClaimableUtxoTo
  UtxoCreatorFunction                              EncryptedBalanceClaimerFunction
   ├─ ZK prover: web-zk-prover (CDN)              ├─ ZK prover: web-zk-prover (CDN)
   ├─ Mint: wSOL                                  └─ Output: encrypted balance credit
   └─ Output: { utxoRef, scanHint, viewingKey }
```

**Endpoints**
- `GET  /api/umbra/pools` — supported shielded mints (currently wSOL)
- `POST /api/umbra/quote` — preview a private payout (lamports, mint, flow)
- `POST /api/umbra/create-payout-utxo` — auth-gated; creates a `ReceiverClaimableUTXO` for a
  winning position. Returns `{ utxoRef, scanHint, viewingKey }`. Idempotent per `positionId`.
- `GET  /api/umbra/scan-utxos/:wallet` — proxy to the Umbra devnet indexer.

**API contract** — the create-payout-utxo response gives the receiver three things:
- `utxoRef` — opaque identifier persisted server-side as `marketPayouts.umbraRef`
- `scanHint` — short hint to locate the UTXO via the indexer
- `viewingKey` — per-payout viewing key the receiver copies and **shares with auditors only**;
  it is returned exactly once at creation time and never persisted server-side

**Browser claim** — after the server creates the UTXO, the winner clicks **Scan & claim** on the
market page. The browser uses `getCdnZkAssetProvider()` to fetch the ZK prover assets and
`getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction` to claim each scanned UTXO into
their encrypted balance.

**Devnet caveat** — the npm release of `@umbra-privacy/sdk` only ships mainnet network config,
so the SDK initialises with `network:"mainnet"` + the devnet RPC. On-chain Umbra transactions
fail at the RPC level (mainnet program addresses don't exist on devnet), but every failure path
is non-fatal — the regular SOL payout always lands. All SDK call sites are wired correctly so
the integration goes live the moment Umbra ships devnet config.

**Files**
- `server/umbra.ts` — public surface: `getUmbraStatus`, `getUmbraPools`, `getUmbraQuote`,
  `createPayoutUtxo`, `scanUmbraUtxos`
- `server/services/umbra-payouts.ts` — SDK wiring: client init, ZK prover, registration,
  `createReceiverClaimableUtxo`, `sendUmbraPrivatePayout`
- `client/src/pages/market.tsx` — winner UI: green Umbra card with create / copy viewing key /
  scan-and-claim flow
- `shared/schema.ts` — `marketPayouts.umbraRef` + `marketPayouts.umbraQueueSig` columns

Track: **Umbra $10K Privacy Track — Colosseum Frontier 2026**.

---

## 🛡️ Cloak Privacy Integration

A second, complementary privacy rail for prediction-market winners. Where Umbra hides amounts in
an encrypted balance, **Cloak shields the recipient** by redirecting the payout into a brand-new
UTXO that is unlinkable from the market wallet on-chain. The integration uses the official
`@cloak.dev/sdk-devnet` package — no fork, no custom protocol code.

**Endpoints**
- `GET  /api/cloak/status` — reports devnet program ID, relay URL, and SDK availability
- `POST /api/cloak/quote` — preview the shielded payout (lamports, fee, recipient note)
- `POST /api/cloak/shield-payout` — auth-gated; turns a winning position into a Cloak UTXO,
  capped at the `marketPayouts.amountLamports` already credited to the winner. Idempotent per
  `positionId` via a `UNIQUE` constraint on `cloakPayouts.positionId`.

**On-chain target**
- Program: `Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h` (Cloak devnet)
- Relay: `api.devnet.cloak.ag`
- Real Groth16 proofs generated client-side, submitted via the relay — typical proof time
  30–90 seconds for larger positions

**Files**
- `server/cloak.ts` — SDK init, quote builder, shielded payout transaction
- `client/src/components/cloak-shield-button.tsx` — winner UI on the market page

Track: **Cloak $5K Privacy Track — Colosseum Frontier 2026**.

---

## 📊 Dune SIM API Integration

Every trader and every token gets a live on-chain analytics panel powered by Dune's SIM API.
Wallets show their full mainnet activity history; tokens show holders, volume, and transfers.

**Endpoints**
- `GET /api/dune/wallet/:address` — balances and tokens for a wallet
- `GET /api/dune/wallet/:address/activity` — chronological on-chain activity feed
- `GET /api/dune/token/:mint` — holders, volume, transfer stats for a token mint

**Where it shows up**
- Profile pages — "On-chain activity" panel with real mainnet history
- Token detail pages — holder count, volume, and transfer activity
- All data is fetched server-side and cached briefly to stay within rate limits

**Files**
- `server/dune.ts` — SIM API client, response shaping, caching
- `client/src/pages/profile.tsx` and `client/src/pages/token.tsx` — consumers

Track: **Dune SIM API $6K Enterprise Plan Track — Colosseum Frontier 2026**.

---

## 🌐 SNS Identity Integration

`.sol` is the universal identity layer across the whole app. Anywhere a wallet appears — token
creators, market bettors, leaderboard ranks, profiles — a live SNS reverse lookup against
mainnet replaces the 44-character base58 with a human-readable `.sol` name. The search bar
also accepts `.sol` domains directly: type `toly.sol` and it resolves on-chain, then surfaces
every token that wallet has launched.

**Endpoints**
- `GET /api/sns/lookup/:domain` — forward resolution (`bonfida.sol → wallet`)
- `GET /api/sns/resolve/:address` — reverse resolution (`wallet → bonfida.sol`)

**Implementation notes**
- Hand-rolled PDA derivation using `sha256("SPL Name Service" + name)` per the SNS spec
- Mainnet Helius RPC for resolution (SNS lives on mainnet, not devnet)
- 5-minute in-memory cache to stay efficient under load

**Files**
- `server/sns.ts` — forward + reverse resolver, hash + PDA derivation, cache
- `client/src/hooks/use-sns.ts` — React hook used by every wallet display
- `client/src/components/wallet-name.tsx` — the actual UI swap
- `client/src/pages/search.tsx` — search bar that accepts `.sol` domains

Track: **SNS Identity $1.8K Track — Colosseum Frontier 2026**.

---

## 🏗️ Architecture notes

- 🔗 **Hybrid on-chain + off-chain:** core token and market actions are on-chain; gamification, profiles, and indexing are off-chain in PostgreSQL.
- 🛡️ **Crash-safe payouts:** prediction market payouts use idempotency keys and a stuck-processing reaper so a server crash mid-payout cannot double-pay or lose funds.
- 🔄 **Auto-recovery reconciler:** a 60s background job catches any token deploy or market backfill that failed mid-flight and finishes it.
- 🗳️ **Progressive decentralization:** platform-controlled betting pools and fee recipients today, with a clear path to multi-sig + community governance.

---

## 🧑‍⚖️ For judges

Want to test dum.fun in 5 minutes?

1. 🌐 Open **[dum.fun](https://dum.fun)** on desktop or Android.
2. 🪙 Connect a Solana **devnet** wallet (Phantom, Solflare, or Saga). Get free devnet SOL from any [Solana faucet](https://faucet.solana.com).
3. 🚀 Hit **Launch** to mint your own meme token in seconds — every mint address ends in `dum`.
4. 📈 Trade it on the bonding curve, watch the live OHLC chart, and check the real-time activity feed.
5. 🎯 Open any token's **Predictions** tab and bet on whether it will graduate or rug.
6. 🏆 Earn points from quests and climb the **seasonal leaderboard** for SOL rewards.

All actions are real Solana devnet transactions via Helius RPC. No mock data anywhere.

---

<div align="center">

### 💊 Built with too much caffeine for the Solana Colosseum Frontier Hackathon 💊

**[🌐 dum.fun](https://dum.fun) &nbsp;·&nbsp; [🐦 @dumdotfun](https://x.com/dumdotfun)**

📜 MIT License

</div>
