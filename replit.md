# Dum.fun - Solana Meme Coin Launchpad

## Overview

Dum.fun is a Pump.fun-style token launchpad for Solana, featuring a neo-brutalist aesthetic with high-contrast colors and bold design. The platform allows users to browse live meme tokens, view bonding curve progress, and eventually create/trade tokens. Built as a full-stack TypeScript application with React frontend and Express backend, integrating with Pump.fun's API for real token data.

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Use free APIs only (Pump.fun API, Jupiter for pricing, public Solana RPC)

## Current Features

- **Token Listings**: Real-time token feed from Pump.fun API showing name, symbol, image, bonding curve progress, and market cap
- **Token Details**: Individual token pages with full info, price, creator, social links, and trading interface
- **Wallet Connection**: Phantom wallet integration with message signing for verification
- **Create Token**: Form UI ready (actual creation links to Pump.fun for now)

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript
- Vite as build tool with HMR
- Wouter for client-side routing
- TanStack Query for server state and caching

**Pages**
- `/` - Home page with live token grid
- `/token/:mint` - Token detail page with trading interface
- `/create` - Token creation form
- `/profile` - User profile (wallet address, join date)

**UI Component System**
- Shadcn/ui with Radix UI primitives
- Tailwind CSS v4
- Framer Motion for animations
- Neo-brutalist theme: zinc-950 background, red-500 accent, yellow-500 highlights, green-500 for success

### Backend Architecture

**Server Framework**
- Express.js with TypeScript
- HTTP server on port 5000

**API Endpoints**
- `GET /api/tokens` - Fetch live tokens from Pump.fun API
- `GET /api/tokens/:mint` - Get single token details
- `POST /api/users/connect` - Create user from wallet connection
- `GET /api/users/wallet/:address` - Get user by wallet
- `POST /api/waitlist` - Add email to waitlist

**Pump.fun Integration**
- Fetches from `frontend-api.pump.fun/coins`
- Calculates bonding curve progress from virtual reserves
- Returns proper 503 errors when API is unavailable (no mock fallback)

### Database Schema

**users table**
- id (UUID, primary key)
- walletAddress (text, unique)
- createdAt (timestamp)

**tokens table** (schema ready for caching)
- id, mint, name, symbol, description, imageUri
- creatorAddress, bondingCurveProgress, marketCapSol, priceInSol
- isGraduated, createdAt, updatedAt

### Wallet Integration

- Phantom wallet detection and connection
- Message signing for account verification ("Sign in to Dum.fun")
- Session persistence via wallet public key

## Development Notes

### Bonding Curve Mechanics (Pump.fun Model)
- Tokens launch with 800M tokens in bonding curve
- Price adjusts automatically based on buy/sell activity
- When ~85 SOL raised (~$69k market cap), token "graduates" to Raydium DEX
- Platform takes 1% on trades + 6 SOL migration fee

### Future Development
- Implement direct trading on Dum.fun (requires deploying own bonding curve smart contract)
- WebSocket integration for real-time token updates
- Token creation directly on platform
- Own fee collection (1% trades, migration fees)
