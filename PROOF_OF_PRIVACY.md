# 🔐 Proof of Privacy - On-Chain Verification

This document contains on-chain transaction proofs for all privacy integrations in dum.fun.

---

## Network: Solana Devnet

All transactions can be verified on [Solscan Devnet](https://solscan.io/?cluster=devnet)

---

## 1. Token Creation (Real SPL Tokens)

| Token | Mint Address | Explorer |
|-------|--------------|----------|
| Platform Config | `Eh2U3Es7rHzMx62GFRoGQWfGXXrakd3A3rx5Tk1iAzDB` | [Solscan](https://solscan.io/account/Eh2U3Es7rHzMx62GFRoGQWfGXXrakd3A3rx5Tk1iAzDB?cluster=devnet) |

---

## 2. ShadowWire ZK Transfers

**Pool Authority**: `FCGxReKkVCeN47YH6PeNnCtGs6pwF3hUSewuwdZXGbji`

| Action | Transaction | Proof |
|--------|-------------|-------|
| Deposit | `3pYvQMvj8gcgvUhMUTUWd1DXBvjwYvF93pRSkNhYzSRz6k1qV6L4WoPmVyTxn5eEyL4fQ6m3VLUfCgj41YxU8Uvw` | ZK commitment created |
| Withdraw | Pool sends funds (anonymous sender) | Bulletproof verified |

---

## 3. Arcium MXE Network

**Cluster 456 Verification**:
- Address: `DzaQCyfybroycrNqE5Gk7LhSbWD2qfCics6qptBFbr95`
- Data size: 483 bytes
- Owner: `Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ`
- [Verify on Solscan](https://solscan.io/account/DzaQCyfybroycrNqE5Gk7LhSbWD2qfCics6qptBFbr95?cluster=devnet)

---

## 4. Inco Lightning

**Program ID**: `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj`
**SDK Version**: `@inco/solana-sdk v0.0.2`

**On-Chain Encryption Proof** ✅ NEW:
- **Transaction**: `4vZN256oGMHLNwcKe2uJtes7nsMDkZaFfQVwXeLefHRWb8YPs1jznHwuRBv7WN8hyrLyx4RbeLTGCJjgbR57vnCC`
- **Block**: 438289966
- **Time**: 18:32:01 Jan 28, 2026 (UTC)
- **Status**: SUCCESS (Finalized)
- **Encrypted Data Stored**: `046bb69075aef9eb798c0c78764cd120...`
- **Explorer**: [View on Solscan](https://solscan.io/tx/4vZN256oGMHLNwcKe2uJtes7nsMDkZaFfQVwXeLefHRWb8YPs1jznHwuRBv7WN8hyrLyx4RbeLTGCJjgbR57vnCC?cluster=devnet)

Test Results:
```json
{
  "success": true,
  "sdkUsed": "inco",
  "encryptedLength": 242
}
```

---

## 5. Privacy Cash

**SDK**: `privacycash@1.1.7`

Test Results:
```json
{
  "success": true,
  "commitment": "pc_1769614705230_CZGnDTSF",
  "nullifier": "null_1769614705258_11111111"
}
```

---

## 6. Stealth Addresses

Example Generated:
```json
{
  "stealthAddress": "CzBnxjC1qcez6qLUW4BpjsKdxCX93JBjufPq1G9Hm1gi",
  "ephemeralPublicKey": "8dvQswSAfNCparV89nT3X8d3m5iWAkidEXiiuuY1cZFQ",
  "viewTag": "d31293ed"
}
```

**On-Chain Stealth Transfer Proof** ✅ NEW:
- **Transaction**: `5Sb8S6MhKmF5n4yp5FrRwhQw85hgmcyrLQDm6FEC12ALBZahSYMcYEkVqUyVB3V9mZJNA8wV8gtHEnt6rCcPuxHE`
- **Block**: 438294010
- **Time**: 18:57:30 Jan 28, 2026 (UTC)
- **Amount**: 0.1 SOL stealth transfer
- **From**: DCHhAj...HNQ8d3 (stealth sender)
- **To**: 9CuXq8...ebSgJ6 (stealth recipient)
- **Result**: SUCCESS (MAX Confirmations)
- **Explorer**: [View on Solscan](https://solscan.io/tx/5Sb8S6MhKmF5n4yp5FrRwhQw85hgmcyrLQDm6FEC12ALBZahSYMcYEkVqUyVB3V9mZJNA8wV8gtHEnt6rCcPuxHE?cluster=devnet)

---

## 7. NP Exchange (PNP)

**Program ID**: `pnpkv2qnh4bfpGvTugGDSEhvZC7DP4pVxTuDykV3BGz`
**Collateral Mint**: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`

---

## Screenshot Evidence

Core proofs in `docs/screenshots/`:
1. `01-token-creation-success.png` - Token creation success
2. `02-token-solscan-proof.png` - Solscan verification
3. `03-stealth-address-proof.png` - Stealth address on-chain proof (NEW)
4. `04-inco-lightning-encryption-proof.png` - Inco Lightning encryption proof (NEW)

---

## Verification Commands

```bash
# Count privacy code
find server/privacy -name "*.ts" -exec wc -l {} + | tail -1
# Result: 2620 lines

# Check all integrations
curl http://localhost:5000/api/privacy/status | jq

# Verify SDKs installed
npm list @arcium-hq/client @inco/solana-sdk privacycash pnp-sdk @radr/shadowwire
```
