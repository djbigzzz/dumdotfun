# Dum.fun - Solana Token Launchpad + Prediction Markets

## Overview

Dum.fun is a Solana-based token launchpad with integrated prediction markets, offering a neo-brutalist aesthetic. It combines meme token launches with bonding curves and prediction markets, featuring extensive privacy integrations. The platform includes a gamified points and quests system, a leaderboard, and automatic migration of successful tokens to Raydium DEX. It aims to provide a robust, engaging, and privacy-centric experience for launching and betting on Solana-based tokens.

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Platform running on Solana Devnet only (no demo mode)

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, utilizing Vite for tooling, Wouter for routing, Shadcn/ui with Radix UI primitives for components, and Tailwind CSS v4 for styling. Framer Motion is used for animations. The design adheres to a neo-brutalist theme using a palette of zinc-950, red-500, yellow-500, and green-500. Key pages include token listings (`/`, `/tokens`), token creation (`/create`), prediction markets (`/predictions`), documentation (`/docs`), user profiles (`/profile`), and a leaderboard (`/leaderboard`). A privacy mode toggle transforms the UI into a "Matrix green cypherpunk aesthetic" with encrypted betting.

### Backend Architecture

The backend is an Express.js and TypeScript application. It connects to Solana via Helius RPC for all on-chain interactions on devnet. Data persistence is managed using a PostgreSQL database. Real-time features are supported by WebSockets. The backend exposes various API endpoints, including core functionalities for tokens, markets, points, and a comprehensive suite of privacy features such as status checks, stealth address generation, confidential transfers, and integrations with privacy-focused SDKs.

### Core Features & Design Decisions

- **Token Launchpad:** Supports real on-chain SPL token creation on Solana devnet, managed by bonding curves.
- **Prediction Markets:** Allows betting on token survival, incorporating intelligent resolution logic that checks developer holdings and token status (e.g., graduated to Raydium).
- **Gamification (Points & Quests v1):** 10 quests across 4 categories (onboarding, activity, streaks, special), 5 tiers (Fresh Pill 0-499, Curve Rider 500-1999, Full Degen 2000-4999, Diamond Hands 5000-9999, On-Chain God 10000+), daily check-in with streak tracking, and a leaderboard. OG Card is 0.2 SOL on mainnet and grants permanent 1.5x points multiplier. Quest list: connect_wallet (50), first_trade (100), first_bet (100), first_token (500), first_market (300), first_win (200), daily_login (10/day), streak_7 (150), streak_30 (600), mint_og_nft (500). Quests have explicit claim buttons when eligible. OG Card holders see bonus points from 1.5x multiplier in the points summary. Profile page has 3 tabs: Overview, Quests, Leaderboard. Dedicated `/quests` page shows tier ladder, all quests by category, OG Card mint, and daily check-in. Quests teaser widget appears on tokens page and home page linking to `/quests`. Nav bar includes Quests link on both desktop and mobile.
- **Raydium DEX Auto-Migration:** Bonding curves automatically graduate to Raydium CPMM pools once liquidity reaches 85 SOL. This involves on-chain withdrawal of liquidity from the bonding curve and subsequent pool creation.
- **Privacy Integrations:** Extensive privacy features are integrated, including:
    - **Inco Lightning SDK:** For confidential prediction market bets with encrypted amounts.
    - **Stealth Addresses:** To enable one-time receive addresses for untraceable transactions.
    - **Token-2022 Confidential Transfers:** Utilizing Pedersen commitments for hidden balances.
    - **Privacy Cash SDK:** For private deposits and withdrawals of SOL/USDC/USDT with ZK proofs.
    - **Radr ShadowWire SDK:** For hidden transfer amounts using Bulletproofs ZK proofs.
    - **Arcium C-SPL:** For confidential token operations using MPC with AES-256-CTR encryption.
    - **NP Exchange:** For AI agent-based prediction market creation with privacy-focused collateral.
- **TradingView Charts:** Professional OHLC candlestick charts with volume histograms and developer trade bubbles are integrated for token detail pages, supporting various intervals and price toggles.
- **SEO Optimization:** Comprehensive meta tags, Open Graph, Twitter Card tags, JSON-LD structured data, dynamic sitemaps, and robots.txt are implemented for improved search engine visibility.
- **Mobile App:** A native Android application is set up using Capacitor, wrapping the React web app for the Solana dApp Store, with support for Saga wallet integration via `@solana-mobile/wallet-adapter-mobile`.

### Database Schema

The PostgreSQL database includes tables for `users` (wallet addresses, profiles), `tokens` (metadata, bonding curve state), `prediction_markets` (questions, outcomes), `positions` (user bets, including confidential betting fields like `is_confidential`, `encrypted_amount`, `commitment`, `nonce`), `activity_feed`, `waitlist`, `user_points`, and `points_history`.

## External Dependencies

-   **Helius RPC:** Primary Solana RPC service for all server-side Solana connections.
-   **Phantom Wallet:** Used for wallet connection and signing transactions.
-   **Jupiter API:** Provides SOL pricing data.
-   **CoinGecko API:** Serves as a fallback for pricing data.
-   **PostgreSQL:** Relational database for data persistence.
-   **SendGrid:** Utilized for sending waitlist emails.
-   **DFlow API:** (Optional) For tokenized prediction markets (Kalshi on Solana).
-   **@inco/solana-sdk:** For confidential betting.
-   **privacycash:** For private deposits/withdrawals.
-   **Radr ShadowWire SDK:** For private transfers.
-   **@arcium-hq/client, @arcium-hq/reader:** For confidential SPL operations.
-   **@solana-mobile/wallet-adapter-mobile:** For mobile wallet support.
-   **@lightweight-charts/react-wrapper:** For interactive trading charts.
-   **Raydium SDK V2:** For creating CPMM pools on Raydium.