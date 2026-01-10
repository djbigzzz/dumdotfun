# Dum.fun - Privacy-First Solana Token Launchpad + Prediction Markets

## Overview

Dum.fun is a Solana-based privacy-preserving platform for the **Solana Privacy Hack 2026** hackathon, offering token launchpad and prediction market functionalities with a neo-brutalist aesthetic. The platform combines meme token launches with bonding curves and confidential prediction markets, targeting multiple bounty tracks.

**Hackathon Submission:** Solana Privacy Hack 2026
**Deadline:** Jan 30, 2026 (submissions Feb 1)
**Fee Recipient Wallet:** G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM

## Privacy Features

- **Helius RPC Integration** ($5K bounty) - All server-side Solana connections use Helius RPC
- **Confidential Betting** - Bets stored privately in database (demo mode)
- **Anonymous Token Creation** - Demo mode creates tokens without requiring wallet connection
- **Devnet Deployment** - Running on Solana Devnet for hackathon testing

### Privacy SDK Stubs (Ready for Integration)

Located in `server/privacy/`:
- **Inco Lightning SDK** (`inco-lightning.ts`) - Confidential prediction market bets ($2K bounty)
- **Token-2022 Confidential Transfers** (`token2022-confidential.ts`) - Private token balances ($15K)
- **Arcium C-SPL** (`arcium-cspl.ts`) - Confidential token trading ($10K bounty)
- **Privacy Index** (`index.ts`) - Exports all integrations with status functions

### Planned Privacy Features
- Noir ZK proofs for private betting verification ($5K Aztec bounty)
- Full on-chain integration when SDKs are released on devnet

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Demo mode clearly indicated with yellow banners
- Platform running on Solana Devnet

## System Architecture

### Frontend Architecture

React 18 + TypeScript with Vite, Wouter routing, Shadcn/ui with Radix UI primitives, Tailwind CSS v4, Framer Motion animations. Neo-brutalist theme (zinc-950, red-500, yellow-500, green-500).

Key pages:
- `/` and `/tokens` - Token listings
- `/create` - Token creation (demo mode)
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
- `positions` - User bets on markets
- `activity_feed` - Platform activity log
- `waitlist` - Email signups

## External Dependencies

- **Helius RPC** - Primary Solana RPC (devnet.helius-rpc.com)
- **Phantom Wallet** - Wallet connection and signing
- **Jupiter API** - SOL pricing
- **CoinGecko API** - Fallback pricing
- **PostgreSQL** - Data persistence
- **SendGrid** - Waitlist emails

## Environment Variables

Required secrets:
- `HELIUS_API_KEY` - Helius RPC access
- `DATABASE_URL` - PostgreSQL connection

Auto-configured:
- `VITE_SOLANA_RPC_URL` - Frontend RPC (public devnet)
- `SOLANA_NETWORK` - Set to "devnet"
