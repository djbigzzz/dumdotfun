# Solana Privacy Hack 2026 Submission

**dum.fun** - Privacy-First Token Launchpad + Prediction Markets

---

## Quick Facts

| Metric | Value |
|--------|-------|
| Bounties | 9 sponsors, $75,500+ |
| Privacy Code | 2,249 lines |
| Network | Solana Devnet |
| Status | All integrations active |

---

## 5-Minute Test

1. Open the app, connect Phantom (Devnet)
2. Click Privacy Hub icon in header - see all integrations
3. Create a token - real SPL on-chain
4. Place a confidential bet - toggle privacy mode ON
5. Check Solscan for any transaction

---

## All 9 Privacy Integrations

### 1. ShadowWire (Radr) - $15K

**File**: `server/privacy/shadowwire.ts` (513 lines)

Bulletproof ZK proofs for private transfers with 22 token support.

**Functions**:
- `prepareShadowWireDeposit()` - Deposit to privacy pool
- `executeShadowWireDeposit()` - Execute deposit on-chain
- `prepareShadowWireTransfer()` - Internal transfer (amount hidden)
- `executeShadowWireTransfer()` - Execute private transfer
- `prepareShadowWireWithdraw()` - Withdraw (pool is sender)
- `executeShadowWireWithdraw()` - Execute withdraw on-chain
- `getShadowWireBalance()` - Get private balance
- `getShadowWireStatus()` - Integration status

**API**:
```
POST /api/privacy/shadowwire/deposit
POST /api/privacy/shadowwire/transfer
POST /api/privacy/shadowwire/withdraw
GET  /api/privacy/shadowwire/balance/:wallet
```

**Privacy**: Internal transfers have NO on-chain record. Withdrawals show pool as sender.

---

### 2. Token-2022 Confidential - $15K

**File**: `server/privacy/token2022-confidential.ts` (427 lines)

Pedersen commitments for hidden balances. Hybrid strategy: works now, auto-upgrades when full API ships.

**Functions**:
- `createConfidentialMint()` - Create mint with confidential extension
- `initializeConfidentialAccount()` - Setup account for confidential
- `depositToConfidentialBalance()` - Move to confidential balance
- `confidentialTransfer()` - Transfer with hidden amount
- `withdrawFromConfidentialBalance()` - Move back to public
- `getConfidentialBalance()` - Get encrypted balance
- `generateTransferProof()` - Generate ZK proof
- `verifyTransferProof()` - Verify proof validity
- `getImplementationMode()` - Check if real API or fallback

**API**:
```
POST /api/privacy/confidential-transfer
GET  /api/privacy/confidential-balance/:wallet
```

**Program**: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

---

### 3. Stealth Addresses (Anoncoin) - $10K

**File**: `server/privacy/stealth-addresses.ts` (230 lines)

One-time receive addresses. Each address is unlinkable to your wallet.

**Functions**:
- `generateStealthAddress()` - Create one-time address
- `scanForStealthPayments()` - Find payments to your addresses
- `generateStealthMetadata()` - Create metadata for sender
- `parseStealthMetadata()` - Decode metadata
- `verifyStealthOwnership()` - Prove you own an address

**API**:
```
POST /api/privacy/stealth-address
POST /api/privacy/verify-stealth-ownership
```

**Crypto**: ECDH shared secret + view tags for efficient scanning.

---

### 4. Privacy Cash SDK - $15K

**File**: `server/privacy/privacy-cash.ts` (200 lines)

Private deposits/withdrawals breaking on-chain links. OFAC compliant.

**Functions**:
- `preparePrivateDeposit()` - Prepare private deposit
- `preparePrivateWithdraw()` - Prepare private withdrawal with nullifier
- `getPrivateCashBalance()` - Get private balance
- `addPrivateBalance()` - Credit internal balance
- `subtractPrivateBalance()` - Debit internal balance

**API**:
```
POST /api/privacy/cash/deposit
POST /api/privacy/cash/withdraw
GET  /api/privacy/cash/balance/:wallet
```

**Privacy**: Nullifier scheme prevents double-spend while breaking deposit/withdraw link.

---

### 5. Arcium C-SPL (MPC) - $10K

**File**: `server/privacy/arcium-cspl.ts` (108 lines)

Multi-Party Computation for confidential token operations.

**Functions**:
- `createCSPLToken()` - Create confidential token
- `mintConfidential()` - Mint with hidden amount
- `transferConfidential()` - Transfer with encrypted amount
- `getEncryptedBalance()` - Get encrypted balance
- `decryptBalance()` - Decrypt with private key
- `generateTransferProof()` - Generate MPC proof

**Program**: `Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX`

---

### 6. Inco Lightning - $2K

**File**: `server/privacy/inco-lightning.ts` (217 lines)

Confidential betting for prediction markets. Bet amounts encrypted.

**Functions**:
- `encryptBetAmount()` - Encrypt bet client-side
- `createConfidentialBet()` - Place encrypted bet
- `verifyBetCommitment()` - Verify commitment matches
- `aggregateEncryptedPool()` - Combine bets for odds
- `revealBetAmount()` - Reveal after settlement

**API**:
```
POST /api/markets/:id/confidential-bet
```

**Commitment**: `SHA256(amount:side:nonce:wallet)`

**Program**: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`

---

### 7. PNP Exchange (AI Agents) - $2.5K

**File**: `server/privacy/np-exchange.ts` (219 lines)

AI agent-based prediction market creation with LLM integration.

**Functions**:
- `createAIAgentMarket()` - Create market via AI
- `getNPExchangeIntegration()` - Get integration config

**API**:
```
POST /api/privacy/pnp/ai-market
GET  /api/privacy/pnp/status
```

---

### 8. Helius RPC - $5K

**File**: `server/helius-rpc.ts`

All Solana connections route through Helius RPC.

**Usage**:
```typescript
import { getConnection } from "./helius-rpc";
const connection = getConnection(); // Uses Helius
```

**Verification**:
```bash
grep -r "getConnection" server/*.ts  # All use helius-rpc
```

---

### 9. encrypt.trade Education - $1K

**File**: `client/src/pages/docs.tsx` (800+ lines)

Privacy education content:
- Why Privacy Matters
- Understanding Wallet Surveillance
- Privacy Technologies
- Getting Started

---

## Verification Commands

```bash
# Count privacy code
find server/privacy -name "*.ts" -exec wc -l {} + | tail -1
# Result: 2249 lines

# Check all integrations
curl http://localhost:5000/api/privacy/status | jq

# Test stealth address
curl -X POST http://localhost:5000/api/privacy/stealth-address \
  -H "Content-Type: application/json" \
  -d '{"recipientWallet":"YOUR_WALLET"}' | jq

# Check ShadowWire status
curl http://localhost:5000/api/privacy/shadowwire/status | jq
```

---

## On-Chain Proofs

| Action | Transaction |
|--------|-------------|
| Token Creation | [Solscan](https://solscan.io/tx/3i6wQJZqrg9qhTXagnpUUNRZg2S52uEChz96yQjihJtgmYvh8sTu7cgfrCdCtedypHQhhshjEEyqnHkR7L7HUM7W?cluster=devnet) |
| ShadowWire Withdraw | [Solscan](https://solscan.io/tx/rwJSdu6ngU5wMjRCizeARpcMyMn6ZDFbGUZmNjcpRgLHJ9YFBKUys8EnvXd84nigb6acW9aUfS4UnYq2rGZuPMd?cluster=devnet) |

---

## File Structure

```
server/privacy/
├── index.ts              (200 lines) - Exports all integrations
├── shadowwire.ts         (513 lines) - Bulletproof ZK
├── token2022-confidential.ts (427 lines) - Pedersen commitments
├── stealth-addresses.ts  (230 lines) - One-time addresses
├── inco-lightning.ts     (217 lines) - Confidential betting
├── np-exchange.ts        (219 lines) - AI agent markets
├── privacy-cash.ts       (200 lines) - Private deposits
├── pool-authority.ts     (135 lines) - Pool management
└── arcium-cspl.ts        (108 lines) - MPC tokens

Total: 2,249 lines
```

---

## Screenshots

All in `docs/screenshots/`:
1. Token creation
2. Solscan verification
3. Privacy Hub
4. ShadowWire flow (deposit, transfer, withdraw)
5. Stealth addresses
6. Confidential betting
7. Token-2022 transfers

---

**Total Bounty Target: $75,500+**
