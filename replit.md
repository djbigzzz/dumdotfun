# Dum.fun - Solana Token Launchpad + Prediction Markets

## Overview

Dum.fun is a Solana-based platform offering both token launchpad and prediction market functionalities with a neo-brutalist aesthetic. Its primary purpose is to allow users to launch meme tokens with bonding curves and create/bet on prediction markets for various outcomes, including token-specific events. The platform supports two token creation paths: integration with Pump.fun for quick launches and a custom bonding curve contract for greater control.

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Use free APIs only (Pump.fun API, Jupiter for pricing, public Solana RPC)

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for building and Wouter for routing. UI components leverage Shadcn/ui with Radix UI primitives, styled with Tailwind CSS v4, and animations handled by Framer Motion. The design follows a neo-brutalist theme using specific color palettes (zinc-950, red-500, yellow-500, green-500). Key pages include `/create` for token creation, `/tokens` for browsing, and `/profile` for user details.

### Backend Architecture

The backend is an Express.js application with TypeScript, providing API endpoints for token management, user authentication, prediction markets, and trading. It integrates with Solana for on-chain interactions. All tokens created on the platform are stored in a PostgreSQL database. Real-time updates are handled via WebSocket integration, connecting to PumpPortal for live token creation and trade events.

### Platform Features

- **Token Launchpad**: Supports token creation via Pump.fun integration or a custom bonding curve contract, with metadata stored in PostgreSQL.
- **Prediction Markets**: Users can create general or token-specific yes/no markets, with betting functionality and Constant Product Market Maker (CPMM) for odds.
- **Referral System**: Generates unique referral codes and tracks referrals.
- **Wallet Integration**: Phantom wallet integration for connection and message signing.
- **Real-time Activity**: Live activity feed for new tokens, trades, and graduations via WebSockets.

### Database Schema

The PostgreSQL database includes tables for `users`, `tokens`, `prediction_markets`, `positions`, and `activity_feed` to manage user data, token metadata, market details, user bets, and platform activity respectively.

### Technical Implementations

- **Token Creation**: Utilizes PumpPortal API for real on-chain deployment to Pump.fun, including client-side mint keypair generation for security.
- **Bonding Curve**: The custom contract (Anchor-based Solana program) implements a constant product (x*y=k) bonding curve with platform fees and a graduation threshold for DEX migration.
- **Image Handling**: Client-side image compression using sharp for uploads.
- **Price Fetching**: SOL price fetching uses Jupiter API with CoinGecko fallback and caching.
- **Error Handling**: Focuses on robust error handling with no mock data, only real blockchain data or clear error messages.

## External Dependencies

- **Solana Blockchain**: Core blockchain for token operations and smart contracts.
- **Phantom Wallet**: For user wallet connection and transaction signing.
- **Pump.fun API**: For quick token launches and IPFS metadata uploads.
- **PumpPortal API**: For building unsigned transactions for Pump.fun.
- **Jupiter API**: Primary API for fetching SOL and token prices.
- **CoinGecko API**: Fallback API for fetching SOL prices.
- **Dexscreener API**: For live token data (free, no auth).
- **Helius DAS API**: For on-chain token data.
- **PostgreSQL**: Relational database for storing platform data.
- **Sharp (Node.js library)**: For image compression and resizing.