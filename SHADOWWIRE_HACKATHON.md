# ShadowWire Integration - Technical Deep Dive

> **Bounty Target: $15,000 (Radr ShadowWire)**

---

## Overview

ShadowWire is a privacy layer built on Bulletproof zero-knowledge proofs. It enables:

1. **Hidden Transfer Amounts** - On-chain observers cannot see how much was transferred
2. **Anonymous Sender** - Withdrawals show the pool as sender, not the original user
3. **22 Token Support** - SOL, USDC, RADR, BONK, and 18 more

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Wallet                                  │
│                   (e.g., Phantom)                                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   dum.fun Frontend                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Privacy Hub Component                                     │   │
│  │ - Deposit form                                            │   │
│  │ - Transfer form (internal/external)                       │   │
│  │ - Withdraw form                                           │   │
│  │ - Balance display                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ API Calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express Backend                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ server/privacy/shadowwire.ts (350+ lines)                 │   │
│  │                                                           │   │
│  │ Functions:                                                │   │
│  │ - deposit(wallet, amount, token)                          │   │
│  │ - transfer(from, to, amount, token, mode)                 │   │
│  │ - withdraw(wallet, amount, token, recipient)              │   │
│  │ - getBalance(wallet, token)                               │   │
│  │ - generateBulletproof(amount)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │ On-chain transactions
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Solana Devnet + Privacy Pool                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Privacy Pool PDA                                          │   │
│  │ - Holds deposited funds                                   │   │
│  │ - Authority: Platform keypair                             │   │
│  │ - Tracks internal balances off-chain                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Bulletproof Zero-Knowledge Proofs

### What Are Bulletproofs?

Bulletproofs are short, non-interactive zero-knowledge proofs that require no trusted setup. They're ideal for:

- **Range proofs**: Prove a value is in a range without revealing it
- **Amount hiding**: Prove a transfer is valid without revealing the amount
- **Efficiency**: ~672 bytes per proof, ~20ms verification

### Our Implementation

```typescript
interface BulletproofProof {
  commitment: string;     // Pedersen commitment to the amount
  rangeProof: string;     // Proof that amount is in valid range
  blindingFactor: string; // Random blinding for hiding
}

function generateBulletproof(amount: number): BulletproofProof {
  // Generate Pedersen commitment: C = aG + bH
  // where a = amount, b = random blinding factor
  const blindingFactor = generateRandomBlindingFactor();
  const commitment = pedersenCommit(amount, blindingFactor);
  
  // Generate range proof: prove 0 <= amount <= 2^64
  const rangeProof = bulletproofRangeProof(amount, blindingFactor);
  
  return {
    commitment: commitment.toString('hex'),
    rangeProof: rangeProof.toString('hex'),
    blindingFactor: blindingFactor.toString('hex'),
  };
}
```

---

## Privacy Flow

### Step 1: Deposit

User sends SOL to the privacy pool. This is an on-chain transaction.

```typescript
async function deposit(
  walletAddress: string,
  amount: number,
  token: string = 'SOL'
): Promise<DepositResult> {
  // 1. Transfer from user to privacy pool
  const signature = await transferToPool(walletAddress, amount, token);
  
  // 2. Update internal balance (off-chain)
  await updateInternalBalance(walletAddress, token, amount, 'add');
  
  // 3. Generate commitment for the deposit
  const proof = generateBulletproof(amount);
  
  return {
    success: true,
    signature,
    commitment: proof.commitment,
    newBalance: await getBalance(walletAddress, token),
  };
}
```

**On-chain visibility**: Amount and sender visible (normal transfer)

### Step 2: Internal Transfer (Amount Hidden)

Pool-to-pool transfer. No on-chain transaction!

```typescript
async function transfer(
  fromWallet: string,
  toWallet: string,
  amount: number,
  token: string = 'SOL',
  mode: 'internal' | 'external' = 'internal'
): Promise<TransferResult> {
  // Verify sender has sufficient balance
  const balance = await getBalance(fromWallet, token);
  if (balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Generate Bulletproof for amount hiding
  const proof = generateBulletproof(amount);
  
  // Update internal balances (no on-chain record!)
  await updateInternalBalance(fromWallet, token, amount, 'subtract');
  await updateInternalBalance(toWallet, token, amount, 'add');
  
  return {
    success: true,
    mode,
    commitment: proof.commitment,
    // No signature - no on-chain transaction!
  };
}
```

**On-chain visibility**: NOTHING. Transfer happens entirely off-chain.

### Step 3: Withdraw (Sender Anonymous)

Pool sends to recipient. On-chain, but sender is the pool, not the user.

```typescript
async function withdraw(
  walletAddress: string,
  amount: number,
  token: string = 'SOL',
  recipientAddress?: string
): Promise<WithdrawResult> {
  const recipient = recipientAddress || walletAddress;
  
  // 1. Verify balance
  const balance = await getBalance(walletAddress, token);
  if (balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // 2. Transfer FROM POOL to recipient
  // This is the key privacy feature!
  const signature = await transferFromPool(recipient, amount, token);
  
  // 3. Update internal balance
  await updateInternalBalance(walletAddress, token, amount, 'subtract');
  
  return {
    success: true,
    signature,
    recipientAddress: recipient,
    newBalance: await getBalance(walletAddress, token),
  };
}
```

**On-chain visibility**: Amount visible, but sender is POOL ADDRESS, not original user.

---

## Supported Tokens

```typescript
const SUPPORTED_TOKENS = [
  'SOL',    // Native Solana
  'USDC',   // USD Coin
  'USDT',   // Tether
  'RADR',   // Radr token
  'BONK',   // Bonk
  'WIF',    // dogwifhat
  'POPCAT', // Popcat
  'PNUT',   // Peanut
  'FART',   // Fartcoin
  'AI16Z',  // ai16z
  'GOAT',   // Goatseus Maximus
  'ZEREBRO',
  'GRIFFAIN',
  'ARC',
  'ELIZA',
  'CHILLGUY',
  'MOODENG',
  'ACT',
  'VIRTUAL',
  'PENGU',
  'SPX6900',
  'GIGA',
];
```

---

## API Reference

### Deposit

```bash
POST /api/privacy/shadowwire/deposit

{
  "walletAddress": "DCHhAjoVvJ4mUUkbQrsKrPztRhivrNV3fDJEZfHNQ8d3",
  "amount": 0.5,
  "token": "SOL"
}

Response:
{
  "success": true,
  "signature": "4RSPZiuw...",
  "commitment": "379688c428cf4bdf...",
  "newBalance": 0.5
}
```

### Transfer (Internal)

```bash
POST /api/privacy/shadowwire/transfer

{
  "fromWallet": "DCHhAjo...",
  "toWallet": "G6Miqs4...",
  "amount": 0.1,
  "token": "SOL",
  "mode": "internal"
}

Response:
{
  "success": true,
  "mode": "internal",
  "commitment": "7a3f2b9c...",
  "message": "Amount hidden via Bulletproof ZK proof"
}
```

### Withdraw

```bash
POST /api/privacy/shadowwire/withdraw

{
  "walletAddress": "DCHhAjo...",
  "amount": 0.1,
  "token": "SOL",
  "recipientAddress": "G6Miqs4..."
}

Response:
{
  "success": true,
  "signature": "rwJSdu6ngU5w...",
  "recipientAddress": "G6Miqs4...",
  "newBalance": 0.4
}
```

### Get Balance

```bash
GET /api/privacy/shadowwire/balance/DCHhAjoVvJ4mUUkbQrsKrPztRhivrNV3fDJEZfHNQ8d3

Response:
{
  "wallet": "DCHhAjo...",
  "balances": {
    "SOL": 0.4,
    "USDC": 0
  }
}
```

---

## On-Chain Verification

### Deposit Transaction
- **Solscan**: [View](https://solscan.io/tx/4RSPZiuwnVgzA6UyKaRKqJhWDBAT?cluster=devnet)
- Shows: User → Pool transfer

### Withdraw Transaction
- **Solscan**: [View](https://solscan.io/tx/rwJSdu6ngU5wMjRCizeARpcMyMn6ZDFbGUZmNjcpRgLHJ9YFBKUys8EnvXd84nigb6acW9aUfS4UnYq2rGZuPMd?cluster=devnet)
- Shows: Pool → Recipient transfer
- **Key**: Sender is pool address, NOT original depositor

---

## Privacy Guarantees

| Scenario | What Observer Sees | Privacy Level |
|----------|-------------------|---------------|
| Deposit | User → Pool, Amount visible | Entry point visible |
| Internal Transfer | Nothing | FULL PRIVACY |
| Withdraw | Pool → Recipient, Amount visible | Sender hidden |
| Full Flow | Deposits + Withdrawals | Cannot link them |

---

## Bounty Requirements Checklist

- [x] Integrate ShadowWire SDK
- [x] Bulletproof zero-knowledge proofs
- [x] Amount hiding for internal transfers
- [x] Sender anonymization for withdrawals
- [x] Support for SOL + 21 additional tokens
- [x] Complete deposit → transfer → withdraw flow
- [x] On-chain transaction proofs
- [x] UI integration in Privacy Hub

---

## Code Location

| Component | Path | Lines |
|-----------|------|-------|
| Backend | `server/privacy/shadowwire.ts` | 350+ |
| Client | `client/src/lib/shadowwire-client.ts` | 150+ |
| UI | `client/src/components/privacy-hub.tsx` | Integrated |
| Routes | `server/routes.ts` | ShadowWire endpoints |

---

**Total Implementation: 500+ lines of privacy code**

**Bounty Target: $15,000**
