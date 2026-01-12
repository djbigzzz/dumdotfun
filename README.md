# dum.fun - Privacy-First Solana Token Launchpad

> A privacy-preserving token launchpad with confidential prediction markets for the **Solana Privacy Hack 2026**

## Overview

dum.fun combines meme token launches with bonding curves and confidential prediction markets on Solana. Built with privacy at its core, the platform enables anonymous token creation and private betting while maintaining full transparency where needed.

**Live Demo:** Running on Solana Devnet

## Deployed Contract (Devnet)

| Item | Value |
|------|-------|
| **Program ID** | `6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh` |
| **Authority** | `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM` |
| **Fee Recipient** | `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM` |
| **Platform Config PDA** | `Eh2U3Es7rHzMx62GFRoGQWfGXXrakd3A3rx5Tk1iAzDB` |
| **Fee** | 1% |
| **Graduation Threshold** | 85 SOL |

## Privacy Features

### Currently Implemented

| Feature | Status | Description |
|---------|--------|-------------|
| **Helius RPC** | Active | All Solana connections use Helius RPC infrastructure |
| **Confidential Betting** | Active | Prediction market bets stored privately in encrypted database |
| **Anonymous Token Creation** | Active | Create tokens in demo mode without revealing wallet |
| **Devnet Deployment** | Active | Running on Solana Devnet for testing |

### Planned Integrations

| Feature | Technology | Bounty |
|---------|-----------|--------|
| **Private Balances** | Token-2022 Confidential Transfers | Private Payments Track |
| **Confidential Markets** | Inco Lightning SDK | $2K Inco Bounty |
| **ZK Betting Proofs** | Noir Framework | $5K Aztec Bounty |
| **Confidential Trading** | Arcium C-SPL | $10K Arcium Bounty |

## Hackathon Tracks

### Main Tracks
- **Private Payments ($15K)** - Confidential prediction market betting
- **Privacy Tooling ($15K)** - Privacy-first token launchpad
- **Open Track ($18K)** - Combined platform with full privacy stack

### Bounties
- **Helius ($5K)** - Using Helius RPC for all Solana connections
- **Inco ($2K)** - Confidential prediction markets with Lightning SDK
- **Aztec ($5K)** - Noir ZK proofs for betting verification
- **Arcium ($10K)** - C-SPL confidential token trading

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite build system
- Tailwind CSS v4
- Framer Motion animations
- Shadcn/ui components

### Backend
- Express.js + TypeScript
- PostgreSQL database (Drizzle ORM)
- WebSocket real-time updates
- Helius RPC integration

### Blockchain
- Solana Devnet
- Phantom wallet integration
- Token-2022 ready architecture

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Helius API key

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
HELIUS_API_KEY=your-helius-api-key

# Auto-configured
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/privacy/status` | Privacy stack status |
| `GET /api/tokens` | List all tokens |
| `POST /api/tokens` | Create new token |
| `GET /api/markets` | List prediction markets |
| `POST /api/markets/:id/bet` | Place a bet |

## Architecture

```
client/
  src/
    components/     # Reusable UI components
    pages/          # Route pages
    lib/            # Utilities and hooks
server/
  routes.ts         # API endpoints
  storage.ts        # Database operations
  solana.ts         # Blockchain integration
shared/
  schema.ts         # Database schema
```

## Privacy Status API

Check the platform's privacy features:

```bash
curl https://your-app.replit.app/api/privacy/status
```

Response:
```json
{
  "platform": "dum.fun",
  "hackathon": "Solana Privacy Hack 2026",
  "network": "devnet",
  "privacyFeatures": {
    "heliusRpc": true,
    "confidentialBetting": true,
    "anonymousTokenCreation": true,
    "privateBalances": "planned",
    "zkProofs": "planned"
  },
  "rpcProvider": "Helius"
}
```

## License

MIT License - See LICENSE file for details

## Team

Built for the Solana Privacy Hack 2026

## Links

- [Solana Privacy Hack](https://solana.com/privacyhack)
- [Helius RPC](https://helius.dev)
- [Inco Network](https://inco.org)
- [Arcium](https://arcium.com)
