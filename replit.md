# Dum.fun - Solana Token Launchpad + Prediction Markets

## Overview

Dum.fun is a Solana-based token launchpad with integrated prediction markets, offering a neo-brutalist aesthetic. It combines meme token launches with bonding curves and prediction markets. The platform includes a gamified points and quests system, a seasonal leaderboard with SOL rewards, and automatic migration of successful tokens to Raydium DEX. Winner of the Solana Privacy Hackathon 2026 and recipient of a Solana Foundation Ireland grant.

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Platform running on Solana Devnet only (no demo mode)

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, utilizing Vite for tooling, Wouter for routing, Shadcn/ui with Radix UI primitives for components, and Tailwind CSS v4 for styling. Framer Motion is used for animations. The design adheres to a neo-brutalist theme using a palette of zinc-950, red-500, yellow-500, and green-500. Key pages include token listings (`/`, `/tokens`), token creation (`/create`), prediction markets (`/predictions`), documentation (`/docs`), user profiles (`/profile`), quests (`/quests`), and a leaderboard (`/leaderboard`). All heavy pages are lazy-loaded with `React.lazy()` + Suspense.

### Backend Architecture

The backend is an Express.js and TypeScript application. It connects to Solana via Helius RPC for all on-chain interactions on devnet. Data persistence is managed using a PostgreSQL database. Real-time features are supported by WebSockets. The backend exposes API endpoints for tokens, markets, points, seasons, quests, and user management.

### Core Features & Design Decisions

- **Token Launchpad:** Supports real on-chain SPL token creation on Solana devnet, managed by bonding curves.
- **Prediction Markets:** Allows betting on token survival, incorporating intelligent resolution logic that checks developer holdings and token status (e.g., graduated to Raydium).
- **Gamification (Points & Quests v1):** 10 quests across 4 categories (onboarding, activity, streaks, special), 5 tiers (Fresh Pill 0-499, Curve Rider 500-1999, Full Degen 2000-4999, Diamond Hands 5000-9999, On-Chain God 10000+), daily check-in with streak tracking, and a leaderboard. OG Card is 0.2 SOL on mainnet and grants permanent 1.5x points multiplier. Quest list: connect_wallet (50), first_trade (100), first_bet (100), first_token (500), first_market (300), first_win (200), daily_login (10/day), streak_7 (150), streak_30 (600), mint_og_nft (500). Quests have explicit claim buttons when eligible. OG Card holders see bonus points from 1.5x multiplier in the points summary. Profile page has 3 tabs: Overview, Quests, Leaderboard. Dedicated `/quests` page shows tier ladder, all quests by category, OG Card mint, and daily check-in. Quests teaser widget appears on tokens page and home page linking to `/quests`. Nav bar includes Quests and Ranks links on both desktop and mobile.
- **Seasons System:** Leaderboard is organized into named seasons (Arkada-style). Season 1 "Genesis" runs until mainnet launch. Top 10 users per season win SOL rewards (total pool configurable per season). Reward distribution: #1=1.5 SOL, #2=1.0, #3=0.75, #4-5=0.5, #6-7=0.25, #8-9=0.1, #10=0.05. Seasons are admin-controlled (no auto-end). DB tables: `seasons` (name, number, status, reward_pool) and `season_rewards` (per-rank payouts). Leaderboard UI shows Seasonal vs All-time toggle, season info banner, per-rank reward badges, multiplier tier tags, and sortable columns.
- **Raydium DEX Auto-Migration:** Bonding curves automatically graduate to Raydium CPMM pools once liquidity reaches 85 SOL. This involves on-chain withdrawal of liquidity from the bonding curve and subsequent pool creation.
- **TradingView Charts:** Professional OHLC candlestick charts with volume histograms and developer trade bubbles are integrated for token detail pages, supporting various intervals and price toggles.
- **SEO Optimization:** Comprehensive meta tags, Open Graph, Twitter Card tags, JSON-LD structured data, dynamic sitemaps, and robots.txt are implemented for improved search engine visibility.
- **Mobile App:** A native Android application is set up using Capacitor, wrapping the React web app for the Solana dApp Store, with support for Saga wallet integration via `@solana-mobile/wallet-adapter-mobile`.

### Privacy Mode (REMOVED)

Privacy mode and all related features have been fully removed from the platform. This includes:
- Client-side: PrivacyProvider context (stubbed to always return false), PrivacyDrawer, PrivacyBadge, PrivacyHub, PrivacyWallet, PrivacyIntegrationsCard components all deleted. Privacy toggle removed from layout header. Privacy-themed Matrix green styling conditionals remain as dead code (always resolving to non-private branch) in some page files but are functionally inert.
- Server-side: All `/api/privacy/*` routes removed (~1400 lines). Server privacy module directory (`server/privacy/`) deleted entirely — this included inco-lightning, stealth-addresses, token2022-confidential, privacy-cash, shadowwire, arcium-cspl, np-exchange, and pool-authority modules.
- `client/src/lib/inco-client.ts` simplified to a no-op stub.
- Documentation page rewritten without any privacy references.

### Database Schema

The PostgreSQL database includes tables for `users` (wallet addresses, profiles), `tokens` (metadata, bonding curve state), `prediction_markets` (questions, outcomes), `positions` (user bets), `activity_feed`, `waitlist`, `user_points`, `points_history`, `seasons` (seasonal leaderboard competitions with SOL reward pools), and `season_rewards` (per-rank reward allocations for completed seasons).

## External Dependencies

-   **Helius RPC:** Primary Solana RPC service for all server-side Solana connections.
-   **Phantom Wallet:** Used for wallet connection and signing transactions.
-   **Jupiter API:** Provides SOL pricing data.
-   **CoinGecko API:** Serves as a fallback for pricing data.
-   **PostgreSQL:** Relational database for data persistence.
-   **SendGrid:** Utilized for sending waitlist emails.
-   **DFlow API:** (Optional) For tokenized prediction markets (Kalshi on Solana).
-   **@solana-mobile/wallet-adapter-mobile:** For mobile wallet support.
-   **@lightweight-charts/react-wrapper:** For interactive trading charts.
-   **Raydium SDK V2:** For creating CPMM pools on Raydium.

## Security Notes

- **npm overrides:** `bfj` is overridden to `^9.1.3` in `package.json` to eliminate the transitive dependency on `jsonpath@1.2.1` (critical CVE). The `bfj` 9.x release dropped `jsonpath` entirely.
- **bigint-buffer CVE patch:** `bigint-buffer@1.1.5` (transitive via `@solana/spl-token` → `@solana/buffer-layout-utils`) has been replaced with a pure JavaScript implementation. The postinstall script at `scripts/patch-bigint-buffer.js` overwrites the native binding entry point with a pure JS equivalent on every `npm install`. The polyfill source lives in `packages/bigint-buffer-polyfill/`.
