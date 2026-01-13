# Dum.fun - Solana Token Launchpad + Prediction Markets

## Overview

Dum.fun is a Solana-based token launchpad with integrated prediction markets. The platform offers a neo-brutalist aesthetic and combines meme token launches with bonding curves and prediction markets.

## Recent Changes (January 2026)

- **Inco Lightning Integration** - Implemented real confidential betting with Inco Lightning SDK
- **Schema Updates** - Added `is_confidential`, `encrypted_amount`, `commitment`, `nonce` columns to positions table
- **Privacy API** - Updated `/api/privacy/status` to report active Inco integration
- **Confidential Betting UI** - Privacy mode toggle enables encrypted betting with visual feedback
- **Docs Update** - Added privacy documentation section explaining Inco integration

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
- **Helius RPC Integration** ($5K bounty) - All server-side Solana connections use Helius RPC
- **Wallet Balance Display** - Shows devnet SOL balance with airdrop button
- **Prediction Markets** - Bet on token survival

### Privacy Integrations (Solana Privacy Hackathon)

**Active Integrations:**
- **Inco Lightning SDK** (`server/privacy/inco-lightning.ts`) - ✅ WORKING
  - Program ID: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
  - Confidential prediction market bets with encrypted amounts
  - Commitment-based privacy scheme
  - Client: `client/src/lib/inco-client.ts`
  - API: `/api/markets/:id/confidential-bet`
  - Bounty target: $2K (Consumer, Gaming, Prediction Markets)

**Pending Integrations:**
- **Token-2022 Confidential Transfers** (`token2022-confidential.ts`) - Planned ($15K)
- **Arcium C-SPL** (`arcium-cspl.ts`) - Planned ($10K bounty)
- **Noir ZK proofs** - Planned ($5K Aztec bounty)

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
- Privacy status API endpoint (`/api/privacy/status`)

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
