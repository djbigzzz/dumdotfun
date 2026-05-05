# Threat Model

## Project Overview

Dum.fun is a React + Vite frontend with an Express/TypeScript backend and PostgreSQL storage. It lets users sign in with Solana wallets, launch devnet tokens, trade them through bonding-curve and Raydium flows, create prediction markets, earn quest points, and appear on public leaderboards. For this scan, the live production scope is the current devnet-only deployment described in `replit.md`; issues that only affect mockups, sandboxes, or local-development-only code are out of scope.

## Assets

- **Wallet-backed user sessions** — SIWS nonces, bearer session tokens, and wallet identity. Compromise allows impersonation and abuse of authenticated endpoints.
- **On-chain action integrity** — token launches, trade records, market bets, payouts, and graduation triggers. The product depends on the backend accurately reflecting real devnet transactions.
- **Public market and token metadata** — token names, symbols, links, images, activity feeds, and prediction market state. Tampering here can mislead users into unsafe trades or fake platform activity.
- **Points, quests, and leaderboard state** — user points and reward standings have business value because they drive rankings and promised SOL rewards.
- **Platform-controlled signing keys and secrets** — database credentials, admin key, pool/payout authorities, API keys, and payout wallets. Exposure can lead to unauthorized administration or loss of funds.
- **Treasury and payout balances** — betting pool wallets, fee recipient flows, and automated payout logic. Incorrect authorization or transaction handling can cause direct financial loss.

## Trust Boundaries

- **Browser / mobile client → Express API** — all request bodies, headers, and wallet-supplied metadata are untrusted until verified server-side.
- **Express API → Solana devnet / external RPCs** — the server must verify claimed signatures and on-chain state before granting points, publishing tokens, or changing market state.
- **Express API → PostgreSQL** — the backend is the authority for public listings, points, and payout records; bad writes here become platform-visible state.
- **Public → authenticated user boundary** — browsing tokens, markets, and activity is public, but state-changing routes must require a valid session tied to the acting wallet.
- **Authenticated user → admin boundary** — admin endpoints protected by `x-admin-key` are materially more privileged and must stay separate from normal wallet auth.
- **Production → dev-only boundary** — only routes and jobs reachable in the deployed app are in scope. Mockup-only code, removed privacy modules, and local-only experiments should be ignored unless proven production-reachable.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`, `server/websocket.ts`, `client/src/App.tsx`
- **Highest-risk code areas:** `server/auth.ts`, token/trade creation and confirmation paths in `server/routes.ts`, payout and graduation services in `server/services/market-payouts.ts` and `server/services/graduation.ts`, token reconciliation in `server/services/token-reconciler.ts`
- **Public surfaces:** token/market listing and detail APIs, activity feeds, SEO/meta rendering, websocket broadcasts
- **Authenticated surfaces:** SIWS-backed trade recording, token creation, market betting, points claiming, profile actions
- **Admin surfaces:** endpoints guarded by `requireAdmin` in `server/routes.ts`
- **Usually out of scope unless proven reachable:** removed privacy code paths, mockup/sandbox artifacts, purely local development workflows

## Threat Categories

### Spoofing

Wallet authentication is the main identity control for privileged user actions. The system must ensure every protected route binds the caller's bearer session to the wallet address in the request body and must keep session tokens unpredictable, short-lived enough for risk, and invalidatable on logout.

### Tampering

This application is especially sensitive to client-side business-rule bypasses. The backend must not trust user-supplied claims about token deployments, trade success, payment completion, bet settlement, quest eligibility, or token metadata safety. Any state that implies a real blockchain action or reward must be derived from verified on-chain evidence or a server-generated pending record that is confirmed before publication.

### Information Disclosure

The app stores wallet-linked activity, leaderboard history, optional emails, and multiple platform secrets. API responses, logs, SEO/meta rendering, and websocket payloads must avoid exposing bearer tokens, secrets, or private payout information. User-controlled text and URLs that are later rendered into public pages must be encoded or strictly validated.

### Denial of Service

Public and authenticated routes can trigger costly RPC calls, database writes, and background jobs. Sensitive endpoints must remain rate limited and should avoid unbounded body sizes, expensive per-request reconciliation loops, or attacker-controlled retries that can amplify Solana/API costs.

### Elevation of Privilege

Normal users must never gain admin capabilities, manipulate other users' market or payout state, or obtain rewards reserved for real on-chain actions. Server-side authorization must be the source of truth for admin routes, payout handling, and all public data publication paths.
