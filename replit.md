# Dum.fun - Solana Meme Coin Launchpad

## Overview

Dum.fun is a satirical anti-launchpad that parodies crypto meme coin platforms like Pump.fun. The application features a "neo-brutalist panic" aesthetic with high-contrast colors, chaotic animations, and an intentionally "broken" design language. The project is built as a full-stack TypeScript application with React on the frontend and Express on the backend, with Solana blockchain integration for wallet analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (alternative to React Router)
- TanStack Query for server state management and caching

**UI Component System**
- Shadcn/ui component library (New York style) with Radix UI primitives
- Tailwind CSS v4 for utility-first styling with custom design tokens
- Framer Motion for animations and interactive effects
- Custom theme with "panic mode" aesthetic: black background (#000000), danger red (#FF0000), safety yellow (#FFFF00), and neon green accents

**Typography Strategy**
- Primary font: Archivo Black (blocky sans-serif for headers)
- Secondary font: Space Mono (monospace for data/terminal text)
- Terminal font: VT323 (retro terminal aesthetic)

**Key Design Patterns**
- Component-based architecture with reusable UI primitives
- Custom doom chart component for visualizing token price crashes
- Layout wrapper component for consistent header/footer structure
- Mock data generators for simulating token behavior and wallet analysis

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for RESTful API endpoints
- HTTP server with support for future WebSocket upgrades
- Custom logging middleware for request/response tracking
- Development mode with Vite middleware for HMR

**Database Strategy**
- Drizzle ORM configured for PostgreSQL (dialect specified as "postgresql")
- In-memory storage implementation (`MemStorage`) for development/demo purposes
- Schema includes users and wallet analysis tables
- Ready for Neon Database serverless PostgreSQL in production

**API Endpoints**
- `/api/analyze-wallet` - POST endpoint for Solana wallet analysis with 5-minute caching
- Wallet address validation using Solana Web3.js
- Error handling with appropriate HTTP status codes

**Solana Integration**
- Connection to Solana mainnet-beta RPC (`https://api.mainnet-beta.solana.com`)
- Wallet balance and transaction history analysis
- "Dum Score" calculation based on SOL lost, rugs hit, and transaction patterns
- Support for real blockchain data with fallback to mock data

### Data Storage Solutions

**Database Schema (Drizzle ORM)**
- `users` table: UUID primary key, username (unique), password
- `wallet_analysis` table: UUID primary key, wallet address (unique), dum score metrics, timestamps
- Zod schemas for runtime validation of insert operations

**Storage Interface**
- Abstract `IStorage` interface for flexibility
- `MemStorage` class implements in-memory storage for development
- Prepared for migration to Drizzle + PostgreSQL for production persistence

**Caching Strategy**
- 5-minute cache for wallet analysis results to reduce RPC calls
- Cache age validation before returning cached data
- Storage layer handles both cache retrieval and creation

### External Dependencies

**Blockchain Services**
- Solana Web3.js for blockchain interaction and wallet validation
- Neon Database serverless PostgreSQL driver for production database
- Phantom wallet integration (browser extension detection)

**UI Libraries**
- Radix UI primitives for accessible, unstyled components
- Lucide React for icon system
- Framer Motion for animation engine
- Recharts for data visualization (chart components)

**Development Tools**
- Replit-specific plugins: cartographer (code navigation), dev-banner, runtime-error-modal
- ESBuild for server-side bundling in production
- TypeScript strict mode for type safety

**Session & Security**
- connect-pg-simple for PostgreSQL session storage (configured but not yet in use)
- express-session for session management
- Passport.js for authentication strategies (configured in dependencies)

**Build & Deployment**
- Custom build script using ESBuild for server bundling
- Vite for client-side bundling
- Dependency allowlist for server bundling optimization (reduces cold start times)
- Static file serving from dist/public in production
- Meta image plugin for OpenGraph/Twitter card image URL generation based on Replit deployment domain