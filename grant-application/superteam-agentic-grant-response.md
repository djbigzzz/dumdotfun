# Superteam Agentic Engineering Grant — AI Session Response
**Prompt entered:** "help me apply for the agentic engineering grant by Superteam"
**Session:** Replit AI (Claude) — Solana development environment
**Date:** April 2026

---

## What I'm Building

**Project:** dum.fun — A Solana Memecoin Launchpad

The Solana memecoin launchpad space has one dominant player with no open alternatives. I'm building **dum.fun**: a permissionless, on-chain memecoin launchpad using a bonding curve model. Anyone will be able to create a token, trade it along the curve, and graduate it to a DEX — all from a clean web UI with Phantom wallet integration.

---

## Project Plan (AI-Generated)

### Phase 1 — Core Launchpad (Week 1–2)
- Solana program interaction via `@solana/web3.js`
- Bonding curve token creation with custom name, symbol, image
- IPFS metadata upload (image + JSON)
- Buy/sell transactions signed via Phantom
- Token listing page with real-time price

### Phase 2 — Trading UI (Week 2–3)
- Real-time price charts (OHLC candlesticks via WebSocket)
- Holder distribution display
- Bonding curve progress bar toward graduation
- Activity feed (buys/sells)

### Phase 3 — Portfolio & Polish (Week 3–4)
- On-chain portfolio page showing all held tokens
- Sell functionality directly from portfolio
- Points/tier system and referral program
- Submit to Colosseum Frontier before May 11

---

## Architecture (AI-Scaffolded)

```
dum.fun/
├── client/src/
│   ├── pages/
│   │   ├── home.tsx          # Token discovery feed
│   │   ├── create.tsx        # Token creation + bonding curve tx
│   │   ├── token/[mint].tsx  # Trading page
│   │   └── profile.tsx       # Portfolio + sell modal
│   └── lib/
│       └── wallet-context.tsx # Phantom wallet integration
├── server/
│   ├── routes.ts             # API: tokens, bonding curve, holdings
│   ├── bonding-curve-client.ts # On-chain price math
│   └── websocket.ts          # Real-time price feeds
└── shared/
    └── schema.ts             # Drizzle ORM + Zod types
```

---

## Sample AI-Generated Code Snippet

The AI scaffolded this bonding curve buy transaction builder:

```typescript
// Build a bonding curve buy transaction
export async function buildBuyTransaction(
  buyer: PublicKey,
  mint: PublicKey,
  solAmount: number
): Promise<Transaction> {
  const bondingCurvePDA = getBondingCurvePDA(mint);
  const curveData = await fetchBondingCurveData(mint);

  const tokenAmount = calculateTokensOut(
    curveData.virtualSolReserves,
    curveData.virtualTokenReserves,
    solAmount
  );

  const ix = await program.methods
    .buy(new BN(tokenAmount), new BN(solAmount * LAMPORTS_PER_SOL))
    .accounts({
      bondingCurve: bondingCurvePDA,
      mint,
      buyer,
    })
    .instruction();

  const tx = new Transaction().add(ix);
  tx.feePayer = buyer;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  return tx;
}
```

---

## How I'm Using AI Tools

I'm using **Replit Agent (Claude)** as my primary development environment. Rather than starting from scratch, I describe features in plain English and the agent:

1. Scaffolds the full file structure
2. Writes Solana transaction builders and PDA derivations
3. Debugs on-chain errors (skipPreflight, signature extraction)
4. Wires up React components to API routes
5. Handles environment-specific config (Vite/HMR for Replit)

This compresses weeks of solo work into days. The $200 USDG grant covers the Pro subscription that makes this workflow possible at the throughput needed to ship before May 11.

---

## Why This Fits the Grant

- Clear Solana integration (bonding curve program, on-chain transactions, wallet)
- Shippable scope — MVP defined, phased plan, hard deadline
- Agentic engineering workflow — AI-first development throughout
- Submitting to Colosseum Frontier before May 11, 2026

---

## Links
- **X:** x.com/galinonchain
- **GitHub:** github.com/djbigzzz
