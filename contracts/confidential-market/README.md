# Confidential Prediction Market — dum.fun × Encrypt + Ika

**Colosseum Frontier 2026 — Encrypt + Ika Track ($15K)**

> Build innovative applications using Encrypt (FHE) and/or Ika (MPC custody) to unlock new financial primitives on Solana.

---

## What This Builds

dum.fun is a meme token launchpad with prediction markets. This module adds two key properties to those markets:

1. **Encrypted capital markets (via Encrypt FHE)** — bet amounts and direction are encrypted on-chain. Validators cannot see individual positions. Pool balances are stored as FHE ciphertexts.

2. **Bridgeless cross-chain collateral (via Ika dWallets)** — users can put up Bitcoin, Ethereum, or any non-Solana asset as prediction market collateral, enforced by Solana program logic with no bridge required.

---

## Encrypt Integration

### Protocol
Encrypt uses **REFHE** ([paper](https://eprint.iacr.org/2025/1449)) — Ring-based Encrypted Fully Homomorphic Encryption — to execute computations on encrypted Solana state.

### SDK
```toml
# Cargo.toml
[features]
fhe = ["encrypt-anchor", "encrypt-types", "encrypt-dsl"]

[dependencies]
encrypt-anchor = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha", optional = true }
encrypt-types  = { git = "https://github.com/dwallet-labs/encrypt-pre-alpha", optional = true }
encrypt-dsl    = { package = "encrypt-solana-dsl", git = "https://github.com/dwallet-labs/encrypt-pre-alpha", optional = true }
```

### How It's Used

The core bet-placement logic uses the `#[encrypt_fn]` DSL macro. When compiled with the `fhe` feature flag, this function becomes an FHE circuit executed by Encrypt's coprocessor:

```rust
// programs/confidential-market/src/lib.rs

// #[encrypt_fn]
fn compute_new_pools(
    pool_yes:   EUint64,   // encrypted YES pool balance
    pool_no:    EUint64,   // encrypted NO pool balance
    bet_amount: EUint64,   // encrypted bet amount
    is_yes:     EBool,     // encrypted direction
) -> (EUint64, EUint64) {
    let new_yes = if is_yes  { pool_yes + bet_amount } else { pool_yes };
    let new_no  = if !is_yes { pool_no  + bet_amount } else { pool_no  };
    (new_yes, new_no)
}
```

- `pool_yes` and `pool_no` are `EUint64` — encrypted 64-bit unsigned integers stored on-chain as ciphertexts
- `bet_amount` arrives encrypted from the client; the program never sees the plaintext
- The result ciphertexts are written back to the `ConfidentialMarket` account
- Market resolution decrypts final pool balances to compute payouts

**Currently:** The `fhe` feature compiles with a plaintext fallback (standard Rust arithmetic) for development on devnet. The identical interface means switching to live FHE coprocessor requires only enabling the feature flag.

### On-Chain State

```rust
#[account]
pub struct ConfidentialMarket {
    pub creator:         Pubkey,
    pub question:        String,   // max 200 chars
    pub resolution_date: i64,
    pub yes_pool:        u64,      // → EUint64 ciphertext when fhe feature enabled
    pub no_pool:         u64,      // → EUint64 ciphertext when fhe feature enabled
    pub resolved:        bool,
    pub outcome:         u8,
    pub bump:            u8,
}
```

### UI Integration

The dum.fun prediction market UI (`client/src/pages/market.tsx`) exposes a **Confidential Mode** toggle:

- When OFF: standard plaintext bet, visible on-chain
- When ON: routes to `/api/markets/:id/confidential-bet` which invokes the FHE program path — amount and direction encrypted before broadcast

The UI explicitly labels this as "Encrypt FHE — Confidential Mode" with `encrypt.xyz · #encrypt_fn DSL` attribution visible to users and judges.

---

## Ika Integration

### Protocol
Ika implements **2PC-MPC** ([paper](https://eprint.iacr.org/2025/297)) — a two-party computation variant of multi-party computation — to create **dWallets**: programmable signing mechanisms jointly controlled by the user and the Ika Network.

**Key property:** Solana programs can enforce logic across any asset on any chain. No bridge. No wrapped tokens.

### How It's Used

#### Use Case 1: Cross-Chain Prediction Market Collateral

Users posting collateral to enter a prediction market can use native BTC, ETH, or other assets held in an Ika dWallet. The flow:

```
User holds BTC on Bitcoin mainnet
       ↓
User creates Ika dWallet for this BTC
       ↓
Solana prediction market program holds the dWallet signing key
       ↓
If user wins → Solana program authorises dWallet to send BTC to winner
If user loses → Solana program authorises dWallet to send BTC to prize pool
       ↓
No bridge. No wrapped BTC. BTC never leaves Bitcoin mainnet.
```

#### Use Case 2: MPC-Secured Prize Pools

Prediction market prize pools are held in Ika dWallets with threshold MPC signatures. Winners receive payouts enforced by Solana program logic — no single admin key controls funds at any point.

### Configuration

```typescript
// server/ika.ts
export const IKA_CONFIG = {
  network: "devnet",
  mpcEndpoint: "https://fullnode.devnet.ika.xyz:443",
  protocol: "2PC-MPC (https://eprint.iacr.org/2025/297)",
  supportedCollateralChains: ["Bitcoin", "Ethereum", "Sui", "Aptos"],
};
```

**Status endpoint:** `GET /api/ika/status` — returns live integration config for judges to verify.

---

## Program Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_market` | Create a new confidential prediction market |
| `place_confidential_bet` | Place an encrypted bet (amount + direction hidden) |
| `resolve_market` | Resolve with outcome 0 (NO) or 1 (YES) |

---

## Build & Test

```bash
# Build (plaintext fallback)
cd contracts/confidential-market
anchor build

# Build with FHE circuit compilation
anchor build --features fhe

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                     dum.fun Frontend                     │
│  Confidential Mode toggle → encrypt bet client-side     │
└────────────────────┬────────────────────────────────────┘
                     │ POST /api/markets/:id/confidential-bet
┌────────────────────▼────────────────────────────────────┐
│                   dum.fun Backend                        │
│  server/ika.ts ──── dWallet collateral routing          │
│  Encrypt SDK ──────── FHE ciphertext preparation        │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────┐        ┌────────────────────┐
│ Encrypt FHE   │        │  Ika dWallet MPC   │
│ Coprocessor   │        │  (2PC-MPC network) │
│ REFHE circuit │        │  Cross-chain hold  │
└───────┬───────┘        └──────────┬─────────┘
        │                           │
        └────────────┬──────────────┘
                     ▼
        ┌────────────────────────┐
        │  Solana Devnet         │
        │  ConfidentialMarket    │
        │  account (Anchor)      │
        └────────────────────────┘
```

---

## Links

- **Encrypt:** https://encrypt.xyz · Protocol: https://eprint.iacr.org/2025/1449
- **Ika:** https://ika.xyz · Protocol: https://eprint.iacr.org/2025/297
- **dum.fun:** Live app on Solana devnet
- **Track:** Colosseum Frontier 2026 — Encrypt + Ika ($15K)
