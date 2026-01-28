# 🚀 Quick Start Guide for Judges

**Want to test dum.fun in 5 minutes? Follow these steps.**

---

## Option 1: Test the Live Deployment (Fastest)

**🌐 Live Demo**: [dum.fun on Devnet](https://dum-fun.replit.app)

### Setup (2 minutes)
1. Install [Phantom Wallet](https://phantom.app/) if you don't have it
2. Open Phantom → Settings → Change Network → **Devnet**
3. Visit the live demo URL
4. Click "Connect Wallet"
5. Click "Airdrop 2 SOL" in the header

### Things to Try
✅ **Create a token** (Tokens page → Create Token button)
- Real SPL token deployed to Devnet
- Costs ~0.05 SOL

✅ **View Privacy Hub** (Click privacy icon in header)
- See all 9 active integrations
- Check ShadowWire balance
- Generate stealth address

✅ **Place a confidential bet** (Predictions page)
- Toggle privacy mode ON
- Bet amount is encrypted

✅ **Check contract on Solscan**
- Program: [6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh](https://solscan.io/account/6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh?cluster=devnet)

---

## Option 2: Run Locally (10 minutes)

### Prerequisites
- Node.js 18+
- PostgreSQL
- Helius API key ([free tier](https://helius.dev))

### Quick Setup
```bash
# 1. Clone
git clone <repository-url>
cd job

# 2. Install
npm install

# 3. Create .env
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/dumfun
HELIUS_API_KEY=your-key-here
SOLANA_NETWORK=devnet
EOF

# 4. Database
npm run db:push

# 5. Run
npm run dev
```

Open http://localhost:5000 and connect your Phantom wallet (set to Devnet).

---

## 🔍 What to Look For

### Verify Code Quality
```bash
# Check TypeScript compilation (should have no errors)
npm run check

# Count privacy implementation lines
find server/privacy -name "*.ts" -exec wc -l {} + | tail -1
# Expected: ~2,255 lines

# Verify key files exist and line counts
wc -l server/privacy/shadowwire.ts        # ~500+ lines
wc -l server/privacy/token2022-confidential.ts  # ~400+ lines
wc -l server/privacy/stealth-addresses.ts # ~200+ lines
```

### Verify Privacy Integrations Work
```bash
# Start server in one terminal
npm run dev

# In a SEPARATE terminal, test endpoints:
curl http://localhost:5000/api/privacy/status | jq

# Test ShadowWire status
curl http://localhost:5000/api/privacy/shadowwire/status | jq

# Expected output includes: "active": true, "tokenCount": 22
```

---

## 🏆 Bounty Checklist

**We're targeting $75,500+ across 9 bounties. Here's what to verify:**

### ShadowWire ($15K)
- [x] Bulletproof ZK proofs implemented
- [x] 22 token support
- [x] Internal/external transfer modes
- [x] Balance encryption/decryption

**Verify:**
```bash
# Check implementation file (~500+ lines)
wc -l server/privacy/shadowwire.ts

# Check status (requires server running)
curl http://localhost:5000/api/privacy/shadowwire/status | jq '.tokenCount'
```

### Token-2022 ($15K)
- [x] Confidential transfer implementation
- [x] Hybrid real/fallback strategy
- [x] Pedersen commitments
- [x] Auto-detection of API version

**Verify:**
```bash
# Check implementation (~400+ lines)
wc -l server/privacy/token2022-confidential.ts

# Verify hybrid strategy exists
grep -n "getImplementationMode" server/privacy/token2022-confidential.ts
```

### Helius ($5K)
- [x] All Solana connections use Helius RPC
- [x] WebSocket feeds via PumpPortal

**Verify:**
```bash
# Check Helius usage in code
grep -r "helius" server/helius-rpc.ts
grep -r "HELIUS_API_KEY" server/
```

### Inco Lightning ($2K)
- [x] Confidential betting implemented
- [x] SHA-256 commitment scheme
- [x] Client-side encryption

**Verify:**
```bash
# Check implementation (~200+ lines)
wc -l server/privacy/inco-lightning.ts

# Verify database schema has confidential fields
grep "encrypted_amount\|commitment\|nonce" shared/schema.ts
```

### Anoncoin Stealth ($10K)
- [x] One-time receive addresses
- [x] View tag scanning
- [x] Sweep functionality

**Verify:**
```bash
# Check implementation (~200+ lines)
wc -l server/privacy/stealth-addresses.ts

# Test stealth address generation
curl -X POST http://localhost:5000/api/privacy/stealth-address \
  -H "Content-Type: application/json" \
  -d '{"recipientWallet":"G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM"}' | jq
```

### Arcium ($10K)
- [x] MPC integration
- [x] C-SPL token operations
- [x] Prototype implementation

**Verify:**
```bash
wc -l server/privacy/arcium-cspl.ts  # ~80+ lines
grep "Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX" server/privacy/arcium-cspl.ts
```

### Privacy Cash ($15K)
- [x] Private deposits/withdrawals
- [x] Nullifier scheme
- [x] Multi-token support

**Verify:**
```bash
wc -l server/privacy/privacy-cash.ts  # ~170+ lines
grep -n "deposit\|withdraw" server/privacy/privacy-cash.ts | head -5
```

### PNP Exchange ($2.5K)
- [x] AI agent integration
- [x] Prediction market creation

**Verify:**
```bash
wc -l server/privacy/np-exchange.ts  # ~160+ lines
grep "AI" server/privacy/np-exchange.ts
```

### encrypt.trade ($1K)
- [x] Privacy education docs
- [x] "Why Privacy Matters" content

**Verify:**
```bash
wc -l client/src/pages/docs.tsx  # Should be 800+ lines
grep -i "privacy" client/src/pages/docs.tsx | wc -l  # 50+ mentions
```

---

## 📊 Quick Stats

Run this to see project stats:
```bash
# Line counts
echo "Privacy code:"
find server/privacy -name "*.ts" -exec wc -l {} + | tail -1

echo "Total TypeScript:"
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
```

**Expected output:**
- Privacy code: ~2,255 lines
- Total TypeScript: ~10,000+ lines

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Make sure PostgreSQL is running
# Update DATABASE_URL in .env
```

### "Helius API key invalid"
```bash
# Get free key at https://helius.dev
# Add to .env as HELIUS_API_KEY
```

### "Phantom not connecting"
```bash
# Make sure Phantom is on Devnet
# Settings → Change Network → Devnet
```

### "Airdrop failed"
```bash
# Devnet sometimes rate limits
# Wait 60 seconds and try again
# Or use: solana airdrop 2 YOUR_ADDRESS --url devnet
```

---

## ⏱️ Time Estimates

- **Live Testing**: 5 minutes
- **Code Review**: 15 minutes
- **Full Local Setup**: 10 minutes
- **Deep Technical Dive**: 30 minutes

**Total time to fully evaluate: ~30 minutes**

---

## ✅ Recommended Judging Flow

1. **Test live deployment** (5 min) — See it working
2. **Review key files** (10 min):
   - `README.md` — Project overview
   - `server/privacy/shadowwire.ts` — Bulletproofs implementation
   - `server/privacy/token2022-confidential.ts` — Token-2022 integration
   - `client/src/components/privacy-hub.tsx` — UI integration
3. **Check documentation** (5 min):
   - `SHADOWWIRE_HACKATHON.md` — Technical deep dive
   - `TOKEN2022_HACKATHON.md` — Hybrid strategy explanation
4. **Verify bounty requirements** (10 min) — Use checklist above

---

<div align="center">

**Thank you for judging dum.fun! 🙏**

We hope you appreciate the effort that went into building
enterprise-grade privacy infrastructure on Solana.

🔒 **Privacy is a human right** 🔒

</div>
