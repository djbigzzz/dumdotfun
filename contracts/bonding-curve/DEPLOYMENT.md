# Bonding Curve Smart Contract Deployment Guide

This guide explains how to deploy the Dum.fun bonding curve smart contract to Solana.

## Income Streams & Fee Collection

The contract generates revenue through:

1. **Trading Fees (1%)** - Collected on every buy and sell transaction
2. **Fee Vault** - All fees accumulate in a dedicated fee vault PDA
3. **Withdraw Function** - Platform authority can withdraw fees to their wallet

### How to Collect Your Fees

After deployment, call `initialize_platform` once to set up:
- Your **authority wallet** (controls fee withdrawal)
- Your **fee recipient wallet** (receives the fees)

Then periodically call `withdraw_fees` to transfer accumulated fees to your wallet.

```bash
# Example: Check fee vault balance
solana balance <fee_vault_pda>

# Withdraw fees (via your deployed program)
# Use Anchor client or custom script to call withdraw_fees instruction
```

## Prerequisites

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup component add rustfmt
   ```

2. **Install Solana CLI**
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
   ```

3. **Install Anchor CLI**
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor avm --locked
   avm install 0.29.0
   avm use 0.29.0
   ```

4. **Create/Import a Solana Wallet**
   ```bash
   # Create new wallet (save the seed phrase!)
   solana-keygen new -o ~/.config/solana/id.json
   
   # Or import existing wallet
   solana-keygen recover -o ~/.config/solana/id.json
   ```

5. **Fund Your Wallet**
   - For devnet: `solana airdrop 2 --url devnet`
   - For mainnet: Transfer ~5 SOL to your wallet address

## Deployment Steps

### 1. Configure Network

```bash
# For devnet testing
solana config set --url devnet

# For mainnet production
solana config set --url mainnet-beta
```

### 2. Build the Program

```bash
cd contracts/bonding-curve
anchor build
```

### 3. Get Program ID

After building, get your program's keypair:

```bash
solana address -k target/deploy/bonding_curve-keypair.json
```

Update the program ID in:
- `Anchor.toml` (all network sections)
- `programs/bonding-curve/src/lib.rs` (declare_id! macro)

### 4. Build Again

```bash
anchor build
```

### 5. Deploy

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

### 6. Save Program ID

After successful deployment, save the program ID. You'll need to update the web app:
- Set `BONDING_CURVE_PROGRAM_ID` environment variable in your Replit app

## Contract Features

### Token Creation
- Creates a new SPL token with bonding curve
- 1 billion total supply, 800 million in bonding curve
- 6 decimal places

### Buying
- Send SOL, receive tokens
- Price increases as supply decreases
- 1% platform fee

### Selling  
- Send tokens, receive SOL
- Price decreases as supply increases
- 1% platform fee

### Graduation
- When ~85 SOL is raised, token "graduates"
- Ready for DEX migration (Raydium)

## Constants (Configurable)

| Constant | Value | Description |
|----------|-------|-------------|
| TOTAL_SUPPLY | 1 trillion | Total token supply (with 6 decimals) |
| BONDING_CURVE_SUPPLY | 800 billion | Tokens available in curve |
| GRADUATION_THRESHOLD | 85 SOL | SOL needed to graduate |
| PLATFORM_FEE_BPS | 100 (1%) | Fee on trades |

## Testing on Devnet

```bash
# Set to devnet
solana config set --url devnet

# Get test SOL
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

## Post-Deployment Setup

After deploying, you MUST initialize the platform:

```typescript
// Initialize platform (run once after deployment)
const [platformConfig] = PublicKey.findProgramAddressSync(
  [Buffer.from("platform_config")],
  programId
);

const [feeVault] = PublicKey.findProgramAddressSync(
  [Buffer.from("fee_vault")],
  programId
);

await program.methods
  .initializePlatform()
  .accounts({
    authority: yourWallet.publicKey,
    feeRecipient: yourFeeWallet.publicKey, // Where fees go
    platformConfig,
    feeVault,
    systemProgram: SystemProgram.programId,
  })
  .signers([yourWallet])
  .rpc();
```

## Withdrawing Fees

```typescript
// Check accumulated fees
const feeVaultBalance = await connection.getBalance(feeVault);
console.log(`Fees available: ${feeVaultBalance / LAMPORTS_PER_SOL} SOL`);

// Withdraw fees
await program.methods
  .withdrawFees(new BN(feeVaultBalance))
  .accounts({
    authority: yourWallet.publicKey,
    platformConfig,
    feeVault,
    feeRecipient: yourFeeWallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([yourWallet])
  .rpc();
```

## Security Considerations

1. **Audit**: Get the contract audited before mainnet deployment
2. **Multisig**: Consider using a multisig for the upgrade authority
3. **Freeze Authority**: The bonding curve account is the freeze authority

## Integration with Web App

After deployment, update these files in the web app:

1. **Environment Variable**
   ```
   BONDING_CURVE_PROGRAM_ID=<your-program-id>
   ```

2. **server/trading.ts** - Already configured to use this program ID

3. **Enable Trading** - Set `TRADING_ENABLED=true` in environment

## Estimated Costs

- **Devnet**: Free (use airdrop)
- **Mainnet**: ~2-5 SOL for deployment + rent
