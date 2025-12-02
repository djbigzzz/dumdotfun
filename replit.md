# Dum.fun - Solana Meme Coin Launchpad

## Overview

Dum.fun is a Pump.fun-style token launchpad for Solana, featuring a neo-brutalist aesthetic with high-contrast colors and bold design. The platform allows users to browse live meme tokens, view bonding curve progress, and eventually create/trade tokens. Built as a full-stack TypeScript application with React frontend and Express backend, integrating with Pump.fun's API for real token data.

## User Preferences

- Preferred communication style: Simple, everyday language
- NO fake/mock data - only real blockchain data or clear errors when APIs fail
- Use free APIs only (Pump.fun API, Jupiter for pricing, public Solana RPC)

## Current Features

- **Token Listings**: Real-time token feed from Pump.fun API with search, filtering by trending/new/graduating/graduated
- **Token Search & Filters**: Search by name/symbol/mint, filter by market cap, creation date, or bonding curve progress
- **Token Details**: Individual token pages with full info, price, creator, social links, and trading interface
- **Wallet Connection**: Phantom wallet integration with message signing for verification
- **User Profile**: Wallet address display with copy button, Solscan link, join date tracking, quick navigation
- **Live Activity Feed**: Real-time updates showing new tokens, trades, and graduations from WebSocket
- **Create Token**: Functional token creation form saving metadata to database with image upload (on-chain deployment pending contract)

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
- `POST /api/tokens/create` - Create new token metadata (saves to database)
- `GET /api/tokens/creator/:address` - Get tokens created by wallet address
- `POST /api/users/connect` - Create user from wallet connection
- `GET /api/users/wallet/:address` - Get user by wallet
- `POST /api/waitlist` - Add email to waitlist
- `GET /api/price/sol` - Get SOL price in USD (Jupiter API)
- `GET /api/price/token/:mint` - Get token price in SOL and USD
- `GET /api/trading/status` - Check if trading is enabled
- `POST /api/trading/quote` - Get quote for buy/sell (requires deployed contract)
- `POST /api/trading/buy` - Build buy transaction (requires deployed contract)
- `POST /api/trading/sell` - Build sell transaction (requires deployed contract)

**Pump.fun Integration**
- Fetches from `frontend-api.pump.fun/coins`
- Calculates bonding curve progress from virtual reserves
- Returns proper 503 errors when API is unavailable (no mock fallback)

**Trading Infrastructure**
- `server/bonding-curve.ts` - Bonding curve math (constant product x*y=k formula)
- `server/trading.ts` - Transaction builders for buy/sell operations
- All trading endpoints return errors until bonding curve contract is deployed
- No mock/fake data - only real on-chain data when contract is live

### Database Schema

**users table**
- id (UUID, primary key)
- walletAddress (text, unique)
- createdAt (timestamp)

**tokens table** (supports both caching and user-created tokens)
- id, mint, name, symbol, description, imageUri
- creatorAddress, bondingCurveProgress, marketCapSol, priceInSol
- isGraduated, deploymentStatus (pending/deployed/graduated)
- twitter, telegram, website (social links)
- createdAt, updatedAt

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

### Trading Infrastructure (Option B - Own Contract)

The platform is designed for deploying your own bonding curve smart contract, not just wrapping Pump.fun. This enables:
- Custom fee structure (1% trading fee configured)
- Full control over graduation mechanism
- Independent token creation

**To Enable Trading:**
1. Clone one of the open-source bonding curve contracts:
   - `m8s-lab/pump-fun-smart-contract` (recommended)
   - `asseph/pumpfun-smart-contract-solana`
   - `Rabnail-SOL/Solana-Pump-Fun-Smart-Contract`
2. Build with Anchor: `anchor build && anchor keys sync`
3. Deploy to devnet: `anchor deploy --provider.cluster devnet`
4. Set env var: `BONDING_CURVE_PROGRAM_ID=<your-program-id>`
5. Update instruction encoding in `server/trading.ts` to match your contract's IDL

**Trading Architecture:**
- `server/bonding-curve.ts` - Constant product formula, quote calculations, fee math
- `server/trading.ts` - Solana transaction builders, PDA derivation, on-chain state fetching
- Slippage protection: 5% default, configurable per trade
- Proper error handling when contract not deployed (no fake data)

### WebSocket Real-Time Updates

The platform includes WebSocket integration for real-time token updates:

**Backend (server/websocket.ts):**
- Connects to PumpPortal WebSocket upstream for real token data
- Subscribes to `subscribeNewToken` for new token creations
- Subscribes to `subscribeTokenTrade` for trade events on specific mints
- Handles `complete`/`migrate` events for token graduation
- Auto-reconnects with proper cleanup when clients disconnect

**Frontend (client/src/lib/use-websocket.ts):**
- React hook `useWebSocket` for real-time updates
- Auto-reconnects on disconnect
- Provides subscribe/unsubscribe functions for specific mints

**Home page live activity feed:**
- Shows real-time token creations (NEW)
- Shows buy/sell trades with SOL amounts
- Shows graduation events (GRADUATED)
- Updates token data in React Query cache

### Session Completed Features (Latest)

**Turn 1-2: WebSocket & Search/Filter**
- Integrated PumpPortal WebSocket for real-time new token creation events
- Implemented live activity feed showing NEW, GRADUATED, and trade events
- Added comprehensive search and filtering system with 4 filter modes
- Fixed all data integrity issues - no mock data fallbacks

**Turn 3: Profile Page Enhancement**
- Redesigned profile page with modern card-based layout
- Added wallet address copy functionality with visual feedback
- Integrated Solscan link for on-chain verification
- Added stat cards showing join date (active, in days)
- Placeholder stat cards for future tokens created and trades tracking
- Quick action buttons for navigation to browse or create tokens

**Turn 4: Token Creation Infrastructure**
- Built complete token creation backend: storage layer, API endpoints, validation
- Implemented frontend form with name, symbol, description, image upload, social links
- Added deploymentStatus tracking for progressive on-chain deployment
- Form submission saves metadata to PostgreSQL database
- Success state shows token ID and pending deployment status
- GET /api/tokens/creator/:address endpoint for fetching user's created tokens

**Turn 5: Multi-Source Token Fetching with Fallback Chain**
- Built smart fallback system for live token data with NO fake/mock data
- Created Dexscreener API integration (free, no auth)
- Implemented Helius DAS API integration for on-chain tokens (free tier available)
- Added direct Solana RPC querying support (requires Helius API key)
- Graceful degradation: External APIs → User-created tokens from database
- App never crashes - honest errors or real data only
- Token endpoint now: `GET /api/tokens` with 4-tier fallback

### Future Development
- On-chain token deployment via deployed bonding curve contract (steps 7-10 of creation)
- SPL token creation transaction building
- Bonding curve initialization with user wallet signing
- Implement tokens created count on profile page
- Portfolio tracking and trading analytics
- Advanced trading features (slippage settings, batch trades)
