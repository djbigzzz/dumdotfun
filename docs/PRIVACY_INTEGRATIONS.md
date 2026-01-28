# Privacy Integrations Reference

Quick reference for all privacy functions. See [HACKATHON.md](../HACKATHON.md) for full details.

## Integration Summary

| Integration | File | Lines | Bounty |
|-------------|------|-------|--------|
| ShadowWire | `shadowwire.ts` | 513 | $15K |
| Arcium MPC | `arcium-cspl.ts` | 476 | $10K |
| Token-2022 | `token2022-confidential.ts` | 427 | $15K |
| Stealth Addresses | `stealth-addresses.ts` | 230 | $10K |
| PNP Exchange | `np-exchange.ts` | 219 | $2.5K |
| Inco Lightning | `inco-lightning.ts` | 217 | $2K |
| Privacy Cash | `privacy-cash.ts` | 200 | $15K |
| Index/Exports | `index.ts` | 218 | - |
| Pool Authority | `pool-authority.ts` | 135 | - |

**Total: 2,620 lines**

**Packages**: `@arcium-hq/client@0.6.5`, `@arcium-hq/reader@0.6.5`

## API Endpoints

```
# ShadowWire
POST /api/privacy/shadowwire/deposit
POST /api/privacy/shadowwire/transfer
POST /api/privacy/shadowwire/withdraw
GET  /api/privacy/shadowwire/balance/:wallet
GET  /api/privacy/shadowwire/status

# Token-2022
POST /api/privacy/confidential-transfer
GET  /api/privacy/confidential-balance/:wallet

# Stealth Addresses
POST /api/privacy/stealth-address
POST /api/privacy/verify-stealth-ownership

# Privacy Cash
POST /api/privacy/cash/deposit
POST /api/privacy/cash/withdraw
GET  /api/privacy/cash/balance/:wallet

# Inco Lightning
POST /api/markets/:id/confidential-bet

# PNP Exchange
POST /api/privacy/pnp/ai-market
GET  /api/privacy/pnp/status

# Status
GET  /api/privacy/status
```

## Program IDs

| Integration | Program ID |
|-------------|------------|
| Token-2022 | `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` |
| Inco Lightning | `5sjEbPiqgZrYwR31ahR6Uk9wf5awoX61YGg7jExQSwaj` |
| Arcium C-SPL | `Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX` |
