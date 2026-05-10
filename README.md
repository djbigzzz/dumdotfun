# Dum.fun

A Solana devnet token launchpad with integrated prediction markets, gamified quests, and automatic Raydium DEX graduation. Built for the Solana Colosseum Frontier Hackathon.

**Live demo:** [dum.fun](https://dum.fun) (Solana Devnet)

---

## What it does

Dum.fun lets anyone launch a meme token on Solana in seconds, trade it on a bonding curve, and bet on its survival in a built-in prediction market. Successful tokens automatically graduate to a Raydium CPMM pool for permanent liquidity.

### Core features

- **One-click token launch** with bonding curve pricing (PumpFun-style)
- **Prediction markets** on every token (Will it rug? Will it graduate?)
- **Automatic Raydium graduation** when a token hits the bonding cap
- **Confidential payouts** for prediction winners via Cloak (UTXO shielded transfers)
- **Gamified points + quests + seasonal leaderboard** with SOL rewards
- **Real-time activity feed** via WebSockets
- **TradingView OHLC candlestick charts** for every token
- **Mobile-native Android app** via Capacitor with Solana Mobile + Saga wallet support
- **SNS .sol name resolution** across all wallet displays
- **Vanity mint addresses** ground out for tokens (every mint ends in `dum`)

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, Tailwind CSS v4, Shadcn/ui (Radix), Framer Motion |
| Backend | Express.js, TypeScript, WebSockets, Node 20 |
| Database | PostgreSQL via Prisma ORM |
| Blockchain | Solana Devnet, Helius RPC, custom bonding curve program, Raydium SDK v2 |
| Privacy | Cloak Protocol (shielded UTXO payouts) |
| Analytics | Dune Sim API for on-chain wallet history |
| Email | SendGrid for waitlist + transactional |
| Mobile | Capacitor (Android), Solana Mobile Stack, Saga wallet adapter |

---

## Hackathon track integrations

This repo targets multiple Frontier Hackathon tracks. Each integration is real, on-chain (where applicable), and reachable from the live app.

| Sponsor | Integration |
|---|---|
| Helius | Primary RPC for all Solana devnet reads/writes + webhook listener for trade indexing |
| Raydium | Automated CPMM pool creation when tokens graduate (85 SOL bonding cap) |
| Dune Sim API | On-chain wallet activity panel showing real mainnet history per trader |
| Cloak | Shielded prediction market payouts so winners can claim confidentially |
| Solana Mobile / Saga | Native Android build with Mobile Wallet Adapter, ready for dApp Store |
| SendGrid | Transactional emails for waitlist and notifications |
| Umbra | Stealth address support for private trading |
| Adevar | Ad attribution + creative tracking for token launches |

---

## Repository scope

This is a single full-stack monorepo containing the **entire** dum.fun product. There are no separate frontend or backend repos. All Solana interactions target **devnet only**; there is no mainnet deployment yet. Mobile app builds from this same repo via Capacitor.

```
client/         React + Vite SPA
server/         Express API, WebSockets, background jobs
prisma/         PostgreSQL schema (Prisma ORM)
android/        Capacitor Android shell
scripts/        Deploy + migration helpers
shared/         Types shared between client and server
```

---

## Where things live

- **Token + market API routes:** `server/routes.ts`
- **Bonding curve client:** `server/bonding-curve-client.ts`
- **Raydium graduation:** `server/services/graduation.ts`, `server/services/raydium-swap.ts`
- **Prediction market payouts:** `server/services/market-payouts.ts`
- **Cloak privacy:** `server/cloak.ts`, `client/src/components/cloak-shield-button.tsx`
- **Token reconciler (background job):** `server/services/token-reconciler.ts`
- **UI components:** `client/src/components/`
- **Pages:** `client/src/pages/` (token, market, profile, ranks, quests, etc.)
- **Theme + styling:** `client/tailwind.config.ts`

---

## Run locally

### Requirements
- Node 20+
- PostgreSQL database
- Helius API key (devnet)

### Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npx prisma db push
npm run dev
```

App will be live at `http://localhost:5000`.

### Required environment variables

```
DATABASE_URL=postgres://...
HELIUS_API_KEY=...
PLATFORM_AUTHORITY_SECRET_KEY=...   # base58 secret, used for prediction payouts
FEE_RECIPIENT_WALLET=...            # SOL address that receives platform fees
SENDGRID_API_KEY=...                # optional, for waitlist emails
DUNE_API_KEY=...                    # optional, for on-chain wallet panel
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the full app (Express + Vite middleware) on port 5000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npx prisma db push` | Sync Prisma schema to the database |
| `npx prisma studio` | Visual DB browser |

---

## Architecture notes

- **Hybrid on-chain + off-chain:** core token and market actions are on-chain via Solana programs; gamification, profiles, and indexing are stored off-chain in PostgreSQL.
- **Crash-safe payout system:** prediction market payouts use idempotency keys and a stuck-processing reaper so a server crash mid-payout cannot double-pay or lose funds.
- **Auto-recovery reconciler:** a 60-second background job catches any token deploy or market backfill that failed mid-flight and finishes it.
- **Progressive decentralization:** platform-controlled betting pools and fee recipients today, with a clear path to multi-sig + community governance.

---

## Known gotchas

See `replit.md` for the full list. Highlights:

- **Devnet only.** Bonding curve program has a known overflow on very large sells; redeploy with checked math is required before mainnet.
- **Vanity keypairs** are stored as plaintext in PostgreSQL today; encryption is needed pre-mainnet.
- **`bigint-buffer` and `bfj`** are patched via npm overrides + a postinstall script to mitigate transitive CVEs.

---

## License

MIT
