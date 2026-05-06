# Dum.fun

Dum.fun is a Solana token launchpad offering prediction markets and gamified token launches with a neo-brutalist aesthetic.

## Run & Operate

*   **Run:** `npm start`
*   **Build:** `npm run build`
*   **Typecheck:** `npm run typecheck`
*   **Codegen:** `npm run codegen`
*   **DB Push:** `npx prisma db push` (for schema changes)

**Required Environment Variables:**
*   `HELIUS_API_KEY`
*   `DATABASE_URL`
*   `FEE_RECIPIENT_WALLET`
*   `PLATFORM_AUTHORITY_SECRET_KEY` (for prediction market payouts)
*   `SENDGRID_API_KEY` (for waitlist emails)
*   `DUNE_API_KEY` (optional, for Dune SIM API)

## Stack

*   **Frontend:** React 18, TypeScript, Vite, Wouter, Shadcn/ui (Radix UI), Tailwind CSS v4, Framer Motion
*   **Backend:** Express.js, TypeScript, WebSockets, Helius RPC
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Build Tool:** Vite
*   **Mobile:** Capacitor (Android)

## Where things live

*   **Frontend Source:** `client/src/`
*   **Backend Source:** `server/`
*   **Database Schema:** `prisma/schema.prisma`
*   **Solana Program Interactions:** `server/bonding-curve-client.ts`, `server/services/raydium-swap.ts`
*   **API Routes:** `server/routes.ts`
*   **UI Components:** `client/src/components/`
*   **Theme/Styling:** `client/tailwind.config.ts` (Tailwind CSS v4)
*   **Prediction Market Payouts Logic:** `server/services/market-payouts.ts`
*   **Cloak Privacy Integration:** `server/cloak.ts`, `client/src/components/cloak-shield-button.tsx`
*   **Platform Fees Configuration:** `server/fees.ts`

## Architecture decisions

*   **Neo-Brutalist Aesthetic:** Consistent design language using a specific color palette (zinc-950, red-500, yellow-500, green-500).
*   **Solana Devnet Focus:** Platform exclusively uses Solana Devnet, leveraging Helius RPC for all on-chain interactions.
*   **Gamified User Engagement:** Implemented a comprehensive points, quests, and seasonal leaderboard system with SOL rewards to incentivize user activity.
*   **Automated DEX Migration:** Successful bonding curve tokens automatically graduate to Raydium CPMM pools to ensure continued liquidity.
*   **Crash-Safe Prediction Market Payouts:** Robust system for automated payouts with idempotency, crash recovery, and double-pay prevention.
*   **Confidential Market Payouts:** Integration with Cloak for UTXO-based shielded payouts on prediction markets, enhancing user privacy.

## Product

*   Solana token launchpad with bonding curves.
*   Prediction markets on token survival and other outcomes.
*   Gamified points and quests system with a seasonal leaderboard.
*   Automatic token migration to Raydium DEX.
*   Professional OHLC candlestick charts for token detail pages.
*   SEO optimized for discoverability.
*   Native Android app via Capacitor.
*   Confidential payouts for prediction market winners via Cloak.

## User preferences

*   Preferred communication style: Simple, everyday language
*   NO fake/mock data - only real blockchain data or clear errors when APIs fail
*   Platform running on Solana Devnet only (no demo mode)

## Gotchas

*   **Prediction Market Manipulation:** Dev-behavior markets are susceptible to manipulation on mainnet without specific mitigations (TWAP/multi-snapshot resolution, randomized resolution time, Sybil wallet detection, honest-side seed enforcement, one dev-behavior market per token).
*   **Bonding Curve Overflow:** The deployed Solana program has a known bug with large sells (`subtract with overflow`). A client-side cap is a temporary workaround; the program needs redeploying with checked math.
*   **Vanity Keypair Security:** `vanity_keypairs.secret` currently stores secrets in plaintext in PostgreSQL; encryption is needed before mainnet.
*   **npm overrides:** `bfj` is overridden to `^9.1.3` to mitigate a critical CVE in `jsonpath`.
*   **bigint-buffer patch:** `bigint-buffer` is polyfilled via a postinstall script due to a transitive dependency issue.

## Pointers

*   **Solana Documentation:** `https://docs.solana.com/`
*   **Helius API Documentation:** `https://docs.helius.xyz/`
*   **Raydium SDK V2 Documentation:** `https://docs.raydium.io/raydium/`
*   **Shadcn/ui Documentation:** `https://ui.shadcn.com/docs`
*   **Tailwind CSS Documentation:** `https://tailwindcss.com/docs`
*   **Framer Motion Documentation:** `https://www.framer.com/motion/`
*   **Cloak Protocol Documentation:** `https://docs.cloak.dev/`