# Dum.fun - Solana Token Launchpad + Prediction Markets

## Overview

Dum.fun is a Solana-based token launchpad with integrated prediction markets. The platform offers a neo-brutalist aesthetic and combines meme token launches with bonding curves and prediction markets.

## Recent Changes (February 2026)

- **Mobile App (Capacitor)** - Set up native Android app for Solana dApp Store
  - Capacitor framework wraps React web app as native APK
  - @solana-mobile/wallet-adapter-mobile for Saga wallet support
  - Mobile utilities: `client/src/lib/mobile-utils.ts`
  - Android project: `android/` directory
  - Build guide: `MOBILE_BUILD.md`
  - App ID: `fun.dum.app`

- **SEO Optimization** - Comprehensive SEO for search engine ranking
  - Enhanced meta tags: title, description, keywords, robots, canonical
  - Open Graph and Twitter Card tags for social sharing
  - JSON-LD structured data (WebApplication, Organization schemas)
  - Dynamic sitemap at `/sitemap.xml` (tokens, markets, static pages)
  - robots.txt for crawler guidance
  - Mobile web app meta tags

- **Market Auto-Resolution** - Implemented prediction market resolution with token health checks
  - Token health checker: Verifies on-chain status (existence, liquidity, trades, graduation)
  - Auto-resolver: Evaluates survival criteria and calculates payouts
  - Resolution status API: `/api/markets/:id/resolution-status`
  - Admin endpoint: `POST /api/markets/auto-resolve`
  - Services: `server/services/token-health.ts`, `server/services/auto-resolver.ts`

## Recent Changes (January 2026)

- **Arcium C-SPL (MPC)** - Implemented confidential token operations using MPC
- **Privacy Cash** - Added private deposits/withdrawals breaking on-chain links
- **ShadowWire ZK Transfers** - Integrated Bulletproof ZK private transfers
- **AI Prediction Markets** - AI agent-based prediction market creation
- **Privacy Education Docs** - "Why Privacy Matters" and "Understanding Wallet Surveillance"
- **Anoncoin Stealth Addresses** - Added one-time receive addresses for private token receiving
- **Token-2022 Confidential Transfers** - Implemented commitment-based confidential transfers
- **Privacy API Expansion** - New endpoints for stealth addresses and confidential transfers
- **Inco Lightning Integration** - Implemented real confidential betting with Inco Lightning SDK
- **Schema Updates** - Added `is_confidential`, `encrypted_amount`, `commitment`, `nonce` columns to positions table
- **Confidential Betting UI** - Privacy mode toggle enables encrypted betting with visual feedback
- **Docs Update** - Added privacy documentation section explaining all privacy integrations

## Deployed Contract (Devnet)

| Item | Value |
|------|-------|
| **Program ID** | `6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh` |
| **Authority** | `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM` |
| **Fee Recipient** | `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM` |
| **Platform Config PDA** | `Eh2U3Es7rHzMx62GFRoGQWfGXXrakd3A3rx5Tk1iAzDB` |
| **Fee** | 1% |
| **Graduation Threshold** | 85 SOL |
| **Network** | Devnet |

## Platform Mode

**DEVNET ONLY** - All tokens are deployed on-chain to Solana devnet. No demo mode.

- Real SPL token creation via Phantom wallet signing
- Wallet balance display with airdrop functionality
- All transactions are real on-chain transactions
- Tokens saved to database after successful on-chain deployment

## Features

- **Real On-Chain Token Creation** - SPL tokens deployed to Solana devnet
- **Helius RPC Integration** - All server-side Solana connections use Helius RPC
- **Wallet Balance Display** - Shows devnet SOL balance with airdrop button
- **Prediction Markets** - Bet on token survival

### Privacy Integrations (Solana Privacy Hackathon)

**Active Integrations:**

1. **Inco Lightning SDK** (`server/privacy/inco-lightning.ts`) - ✅ ACTIVE
   - Program ID: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
   - Package: `@inco/solana-sdk`
   - Test Status: `Success` (Encrypted Length: 248)
   - Confidential prediction market bets with encrypted amounts
   - Commitment-based privacy scheme: SHA-256(amount:side:nonce:address)
   - Client: `client/src/lib/inco-client.ts`
   - API: `/api/markets/:id/confidential-bet`
   - Category: Consumer, Gaming, Prediction Markets

2. **Stealth Addresses** (`server/privacy/stealth-addresses.ts`) - ✅ ACTIVE
   - One-time receive addresses for each token transfer
   - Unlinkable transactions - can't trace holdings to wallet
   - View tag scanning optimization for efficient detection
   - Client: `client/src/lib/stealth-client.ts`
   - API: `/api/privacy/stealth-address`, `/api/privacy/verify-stealth-ownership`
   - Contributes to Anoncoin bounty

3. **Token-2022 Confidential Transfers** (`server/privacy/token2022-confidential.ts`) - ✅ ACTIVE
   - Program ID: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
   - Pedersen commitments for balance hiding
   - Range proofs for amount validation
   - Using commitment fallback while ZK ElGamal program is in audit
   - Client: `client/src/lib/token2022-client.ts`
   - API: `/api/privacy/confidential-transfer`

4. **Privacy Cash SDK** (`server/privacy/privacy-cash.ts`) - ✅ ACTIVE
   - Package: `privacycash@1.1.7`
   - Private SOL/USDC/USDT deposits and withdrawals
   - Zero-knowledge proofs for breaking on-chain links
   - OFAC compliant with selective disclosure
   - API: `/api/privacy/cash/deposit`, `/api/privacy/cash/withdraw`, `/api/privacy/cash/balance/:wallet`

5. **Radr ShadowWire SDK** (`server/privacy/shadowwire.ts`) - ✅ ACTIVE
   - Hidden transfer amounts using Bulletproofs ZK proofs
   - 17 supported tokens (SOL, USDC, RADR, BONK, etc.)
   - Internal transfers (fully private) and external (anonymous sender)
   - API: `/api/privacy/shadowwire/transfer`, `/api/privacy/shadowwire/balance/:wallet`, `/api/privacy/shadowwire/deposit`, `/api/privacy/shadowwire/withdraw`

6. **NP Exchange (PNP)** (`server/privacy/np-exchange.ts`) - ✅ ACTIVE
   - AI agent-based prediction market creation
   - Bonding curve pricing (no orderbook needed)
   - Privacy-focused token collateral
   - API: `/api/privacy/pnp/ai-market`, `/api/privacy/pnp/status`

7. **Arcium C-SPL** (`server/privacy/arcium-cspl.ts`) - ✅ ACTIVE (476 lines)
   - Full SDK: `@arcium-hq/client@0.6.5`, `@arcium-hq/reader@0.6.5`
   - Test Status: `Success` (Computation ID: `arcium_transfer_1769611748461_utq2t0sp0`)
   - AES-256-CTR encryption (fast, client-side)
   - Rescue cipher (ZK-friendly, on-chain)
   - Rescue Prime hash (commitments)
   - MXE session management

**Pending Integrations:**
- **DFlow API** - Tokenized Kalshi prediction markets (awaiting API key)

### Privacy Mode UI
- Toggle with 👁 icon in header
- When enabled: Matrix green cypherpunk aesthetic
- Bets are encrypted with Inco Lightning SDK
- Background: zinc-900/50 for visibility

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Platform running on Solana Devnet only (no demo mode)

## System Architecture

### Frontend Architecture

React 18 + TypeScript with Vite, Wouter routing, Shadcn/ui with Radix UI primitives, Tailwind CSS v4, Framer Motion animations. Neo-brutalist theme (zinc-950, red-500, yellow-500, green-500).

Key pages:
- `/` and `/tokens` - Token listings
- `/create` - Token creation (devnet on-chain)
- `/predictions` - Prediction markets
- `/docs` - Documentation with privacy features
- `/profile` - User profile

### Backend Architecture

Express.js + TypeScript backend with:
- Helius RPC for all Solana connections (devnet)
- PostgreSQL database for tokens, markets, bets, users
- WebSocket for real-time activity feed
- Privacy API endpoints:
  - `/api/privacy/status` - Get all privacy integrations status
  - `/api/privacy/stealth-address` - Generate stealth address
  - `/api/privacy/verify-stealth-ownership` - Verify stealth address ownership
  - `/api/privacy/confidential-transfer` - Create confidential transfer

### Database Schema

PostgreSQL tables:
- `users` - Wallet addresses, profiles
- `tokens` - Token metadata, bonding curve state
- `prediction_markets` - Market questions, outcomes
- `positions` - User bets on markets (with confidential betting fields: is_confidential, encrypted_amount, commitment, nonce)
- `activity_feed` - Platform activity log
- `waitlist` - Email signups

## External Dependencies

- **Helius RPC** - Primary Solana RPC (devnet.helius-rpc.com)
- **DFlow API** - Tokenized prediction markets (Kalshi on Solana)
  - Metadata API: `https://prediction-markets-api.dflow.net`
  - Trade API: `https://quote-api.dflow.net`
  - Requires API key from hello@dflow.net
  - Docs: https://pond.dflow.net/quickstart/api-keys
- **Phantom Wallet** - Wallet connection and signing
- **Jupiter API** - SOL pricing
- **CoinGecko API** - Fallback pricing
- **PostgreSQL** - Data persistence
- **SendGrid** - Waitlist emails

## Environment Variables

Required secrets:
- `HELIUS_API_KEY` - Helius RPC access
- `DATABASE_URL` - PostgreSQL connection
- `DFLOW_API_KEY` - DFlow prediction markets API (optional, get from hello@dflow.net)

Auto-configured:
- `VITE_SOLANA_RPC_URL` - Frontend RPC (public devnet)
- `SOLANA_NETWORK` - Set to "devnet"

## Hackathon Bounty Status (Feb 1 Deadline)

| Bounty | Status | Integration |
|--------|--------|-------------|
| Inco Lightning | ✅ Ready | Confidential betting with encrypted amounts |
| Helius RPC | ✅ Active | All Solana connections use Helius |
| Anoncoin | ✅ Active | Stealth addresses for private receiving |
| Token-2022 | ✅ Active | Commitment-based confidential transfers |
| Privacy Cash | ✅ Active | Private deposits/withdrawals breaking links |
| ShadowWire | ✅ Active | Bulletproof ZK private transfers |
| NP Exchange | ✅ Active | PNP SDK v0.2.4 for devnet markets |
| encrypt.trade | ✅ Active | Privacy education docs |
