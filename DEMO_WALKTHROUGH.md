# Demo Walkthrough Guide

> **Complete step-by-step demonstration of dum.fun privacy features**

---

## Prerequisites

1. **Phantom Wallet** installed and set to **Devnet**
2. **Devnet SOL** (use airdrop button or `solana airdrop 2`)
3. **Live demo** running at localhost:5000 or deployed URL

---

## Demo Flow (15 minutes total - covers all 9 bounties)

### Part 1: Token Creation (2 min)

**Goal**: Show real SPL token creation on Solana Devnet

1. Navigate to **Create Token** page (`/create`)
2. Fill in token details:
   - Name: "Demo Privacy Token"
   - Symbol: "DPT"
   - Description: "Testing privacy features"
3. Click **Create Token**
4. Approve transaction in Phantom
5. Wait for confirmation
6. Copy the mint address
7. Verify on Solscan (Devnet)

**What This Proves**: Real blockchain interaction, not mock data

---

### Part 2: Privacy Hub Overview (1 min)

**Goal**: Show all 9 privacy integrations in one UI

1. Click the **Privacy Hub** icon (shield in header)
2. Observe the dashboard showing:
   - ShadowWire: ACTIVE ($15K bounty)
   - Token-2022: ACTIVE ($15K bounty)
   - Stealth Addresses: ACTIVE ($10K bounty)
   - Privacy Cash: ACTIVE ($15K bounty)
   - Arcium MPC: ACTIVE ($10K bounty)
   - Inco Lightning: ACTIVE ($2K bounty)
   - PNP Exchange: ACTIVE ($2.5K bounty)
   - Helius RPC: Underlying all connections ($5K bounty)
   - encrypt.trade: Privacy education in /docs ($1K bounty)
3. Each integration has status indicator and quick actions

**What This Proves**: Comprehensive privacy infrastructure ($75.5K+ targeted)

---

### Part 3: ShadowWire Privacy Flow (3 min)

**Goal**: Demonstrate amount-hiding and sender anonymization

#### Step 3a: Deposit to Privacy Pool

1. In Privacy Hub, select **ShadowWire** tab
2. Enter deposit amount: **0.5 SOL**
3. Click **Deposit**
4. Approve transaction in Phantom
5. Note the transaction hash
6. Verify on Solscan - shows transfer TO pool address

#### Step 3b: Private Transfer (Amount Hidden)

1. Enter recipient address (can be your own for demo)
2. Enter amount: **0.2 SOL**
3. Click **Transfer (Private)**
4. Observe: "Amount hidden via Bulletproof ZK proof"
5. Note: NO on-chain transaction created
6. Balance updates internally

**Privacy Achievement**: Transfer amount is never recorded on-chain

#### Step 3c: Withdraw (Sender Anonymous)

1. Enter amount: **0.2 SOL**
2. Click **Withdraw**
3. Approve transaction in Phantom
4. Check Solscan for the withdraw transaction
5. **Key observation**: Sender is the POOL ADDRESS, not your wallet

**Privacy Achievement**: On-chain observer cannot link withdraw to depositor

---

### Part 4: Stealth Address Generation (1 min)

**Goal**: Show one-time receive addresses

1. In Privacy Hub, select **Stealth Addresses** tab
2. Click **Generate Stealth Address**
3. Observe the generated address
4. Click **Generate** again
5. **Key observation**: Different address each time
6. Show the view tag for efficient scanning

**What This Proves**: Incoming payments are unlinkable to your main wallet

---

### Part 5: Confidential Betting (2 min)

**Goal**: Demonstrate encrypted prediction market bets

1. Navigate to **Predictions** page (`/predictions`)
2. Click on any active market
3. Select **YES** or **NO** position
4. Enter bet amount: **1 SOL**
5. Toggle **Privacy Mode ON** (lock icon)
6. Observe the UI change to Matrix-green theme
7. See info box: "Inco Lightning Encryption"
8. Click **Private Bet**
9. Wait for confirmation
10. See success message: "Confidential bet placed successfully!"

**What This Proves**: Bet amount is encrypted, other users see "Hidden"

---

### Part 6: Token-2022 Confidential Transfer (1 min)

**Goal**: Show Pedersen commitment-based transfers

1. In Privacy Hub, select **Confidential Transfers** tab
2. Enter recipient address
3. Enter amount to transfer
4. Click **Create Confidential Transfer**
5. Observe the commitment generated
6. Note: Uses Pedersen commitments for hiding

**What This Proves**: Balance hiding on SPL tokens

---

### Part 7: Privacy Cash SDK (1 min) - $15K Bounty

**Goal**: Show private deposits/withdrawals that break on-chain links

1. In Privacy Hub, select **Privacy Cash** tab
2. Enter deposit amount: **0.5 SOL**
3. Click **Deposit to Privacy Pool**
4. Observe nullifier generated for withdrawal proof
5. Later: Withdraw breaks the link between deposit and withdrawal

**API Verification**:
```bash
curl http://localhost:5000/api/privacy/cash/balance/YOUR_WALLET | jq
```

---

### Part 8: Arcium MPC (30 sec) - $10K Bounty

**Goal**: Show Multi-Party Computation integration

1. In Privacy Hub, select **Arcium MPC** tab
2. View the MPC program integration
3. Program ID: `Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX`

**Code Verification**:
```bash
wc -l server/privacy/arcium-cspl.ts  # 108 lines
```

---

### Part 9: Helius RPC (30 sec) - $5K Bounty

**Goal**: Verify all Solana connections use Helius

1. Check any token creation or transaction
2. All connections route through Helius RPC
3. Centralized in `server/helius-rpc.ts`

**Verification**:
```bash
grep -r "helius" server/helius-rpc.ts
grep -r "getConnection" server/*.ts  # All use helius-rpc helper
```

---

### Part 10: encrypt.trade Education (30 sec) - $1K Bounty

**Goal**: Show privacy education content

1. Navigate to **/docs** page
2. View "Why Privacy Matters" section
3. View "Understanding Wallet Surveillance" section
4. Comprehensive privacy education for users

**Verification**:
```bash
wc -l client/src/pages/docs.tsx  # 800+ lines of privacy docs
```

---

## Key Privacy Proofs to Highlight

### 1. ShadowWire Sender Anonymization

**Before** (regular transfer):
```
From: DCHhAjo... (your wallet)
To:   G6Miqs4... (recipient)
Amount: 0.2 SOL
```

**After** (ShadowWire withdraw):
```
From: PoolAuth... (privacy pool)
To:   G6Miqs4... (recipient)
Amount: 0.2 SOL
```

Observer cannot link the withdraw to the original depositor.

### 2. Hidden Transfer Amounts

Regular on-chain transfer: Amount visible to everyone

ShadowWire internal transfer: Amount NEVER recorded on-chain

### 3. Unlinkable Receiving

Same wallet, different stealth addresses:
```
Address 1: 7xYqR9...
Address 2: Fm3kL2...
Address 3: 9pQwE5...
```

No way to prove these belong to the same person.

### 4. Confidential Betting

Public bet:
```
User: DCHhAjo...
Side: YES
Amount: 1.5 SOL  (visible)
```

Confidential bet:
```
User: DCHhAjo...
Side: YES
Amount: [ENCRYPTED]
Commitment: 7a3f2b9c...
```

---

## Verification Commands

```bash
# Check ShadowWire status
curl http://localhost:5000/api/privacy/shadowwire/status | jq

# Generate stealth address
curl -X POST http://localhost:5000/api/privacy/stealth-address \
  -H "Content-Type: application/json" \
  -d '{"recipientWallet":"YOUR_WALLET_HERE"}' | jq

# Check privacy integrations
curl http://localhost:5000/api/privacy/status | jq
```

---

## Common Demo Questions

**Q: Is this real blockchain activity?**
A: Yes, 100% on Solana Devnet. Verify any transaction on Solscan.

**Q: Why Devnet and not Mainnet?**
A: Hackathon rules require Devnet. Production deployment planned post-hackathon.

**Q: How do Bulletproofs work?**
A: Zero-knowledge range proofs that prove an amount is valid without revealing it. ~672 bytes, ~20ms verification.

**Q: Is this OFAC compliant?**
A: Privacy Cash SDK includes selective disclosure for compliance. Users can prove source of funds when needed.

**Q: What's the commitment scheme for betting?**
A: SHA-256(amount:side:nonce:address) - only the bettor can reveal.

---

## Screenshot Checklist for Demo Recording

When recording a demo video, capture:

- [ ] Token creation with Phantom signing
- [ ] Solscan verification of token
- [ ] Privacy Hub dashboard (all integrations)
- [ ] ShadowWire deposit transaction
- [ ] ShadowWire deposit on Solscan
- [ ] ShadowWire private transfer (no tx)
- [ ] ShadowWire withdraw with pool as sender
- [ ] Stealth address generation (show different addresses)
- [ ] Confidential betting toggle ON
- [ ] Privacy mode UI (Matrix green theme)
- [ ] Bet success message
- [ ] Token-2022 confidential transfer

---

**Demo Duration**: 10 minutes for full walkthrough

**Key Message**: dum.fun integrates 8 privacy protocols into a single, cohesive platform. Every feature works on real blockchain infrastructure.
