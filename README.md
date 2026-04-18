# dum.fun

> **Launch a token. Bet on whether it survives.**
> A Solana Devnet launchpad with built-in prediction markets, bonding curves, and gamified seasonal rewards.

- **Live on Devnet:** [dum-fun.replit.app](https://dum-fun.replit.app)
- **Status:** Solana Devnet only — no mainnet yet
- **License:** MIT

---

## What is dum.fun?

A pump.fun-style token launchpad where every coin ships with its own **on-chain prediction market**. Anyone can:

- Launch a real SPL token on Solana Devnet via a bonding curve
- Bet SOL on a token's "will it survive / will it rug" market
- Earn points and climb seasonal leaderboards for real SOL rewards
- Watch tokens auto-graduate to a Raydium CPMM pool once liquidity hits 85 SOL

The UI is intentionally loud — neo-brutalist black, red, yellow, green — to make on-chain trading feel like an arcade.

---

## Features

### Token launchpad
- Real SPL token mints on Solana Devnet (no mocks, no demo mode)
- Bonding-curve pricing with a fixed 1% platform fee
- Automatic Raydium CPMM migration at the 85 SOL liquidity threshold
- Live OHLC candlestick charts with volume bars and dev-trade bubbles

### Prediction markets
- Each token gets a paired market (`Will $TOKEN survive?` / `Will it rug?`)
- Auto-resolved on-chain by reading dev holdings, supply, liquidity, and Raydium graduation status
- Two-step bet flow (`prepare-bet` → wallet sign → `confirm-bet`) with on-chain signature verification
- Tolerant of network hiccups and double-clicks (extracts the signature from the signed tx if the broadcast says "already processed")
- Discovery page with sort, filter, and ending-soon pills
- "If resolved now" preview banner so you can see which side the on-chain criteria currently favor
- "No consensus yet" guard when only the creator has seeded the pool — odds collapse to `—` instead of misleading 100/0

### Gamification (Points & Quests v1)
- 10 quests across onboarding, activity, streaks, and special tiers
- 5 rank tiers from **Fresh Pill** (0–499) to **On-Chain God** (10,000+)
- Daily check-in with streak tracking
- OG Card NFT mint (0.2 SOL on mainnet) → permanent **1.5× points multiplier**

### Seasonal leaderboards
- Arkada-style named seasons (Season 1 — *Genesis*)
- Top 10 win SOL from a configurable per-season pool: 1.5 / 1.0 / 0.75 / 0.5 / 0.5 / 0.25 / 0.25 / 0.1 / 0.1 / 0.05 SOL
- Toggle between **Seasonal** and **All-time** views

### Token-level transparency
- Full holder breakdown and on-chain activity feed
- Dev wallet trade tagging and rug-risk badges
- Token health score computed from supply, liquidity, holder count, and recent activity

### Mobile
- Capacitor-wrapped Android build for the Solana dApp Store
- Saga / mobile wallet adapter support

---

## Tech stack

**Frontend:** React 18 · TypeScript · Vite · Wouter · Tailwind v4 · Shadcn/ui (Radix) · Framer Motion · Lightweight Charts
**Backend:** Express + TypeScript · WebSockets · Drizzle ORM · PostgreSQL
**Solana:** Helius RPC · `@solana/web3.js` · `@solana/spl-token` · Raydium SDK v2 · Phantom & Solana Mobile wallet adapters
**Other services:** Jupiter (SOL price) · CoinGecko (fallback) · Dune SIM API (on-chain analytics) · SendGrid (waitlist email)

---

## Getting started

### Prerequisites
- Node 20+
- A PostgreSQL database (Neon works great)
- A Helius API key (Devnet)
- Phantom wallet on Devnet with some test SOL ([faucet](https://faucet.solana.com))

### Run locally
```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, HELIUS_API_KEY, FEE_RECIPIENT_WALLET, etc.
npm run db:push        # apply Drizzle schema
npm run dev            # serves frontend + backend on :5000
```

### Required environment variables
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `HELIUS_API_KEY` | Solana Devnet RPC |
| `FEE_RECIPIENT_WALLET` | Receives platform fees (must be ≠ your test wallet) |
| `SESSION_SECRET` | Express session signing |
| `SENDGRID_API_KEY` | (Optional) waitlist email |
| `DUNE_API_KEY` | (Optional) richer on-chain activity feed |

---

## Project layout

```
client/        React frontend (pages, components, hooks)
server/        Express API, Solana services, auto-resolver, websockets
shared/        Drizzle schema + zod types shared between client & server
```

Key files worth knowing:

- `shared/schema.ts` — single source of truth for all data models
- `server/routes.ts` — every API endpoint (markets, bets, tokens, points, seasons)
- `server/services/token-health.ts` — on-chain reads for survival-criteria resolution
- `server/auto-resolver.ts` — background loop that closes expired markets
- `client/src/pages/market.tsx` & `markets.tsx` — Polymarket-style detail + discovery
- `client/src/pages/token.tsx` — token detail page with paired market widget

---

## Roadmap

- **Now:** Solana Devnet launchpad + prediction markets, points & seasons, Raydium auto-migration
- **Next:** Challenge windows / tentative resolutions, slimmer create-market UX, mainnet readiness audit
- **Colosseum Frontier 2026 (May 12 deadline):** Confidential betting layer using **Encrypt FHE** + **Ika dWallets** — bet amounts hidden until market resolution
- **Later:** Full mainnet launch, on-chain governance, secondary markets

---

## Contributing

Issues and PRs welcome. Please:

1. Open an issue describing the change before large refactors
2. Run `npm run check` (typecheck) before submitting
3. Keep `data-testid` attributes on every interactive element

---

## License

MIT — do whatever you want, just don't blame us when memes happen.
