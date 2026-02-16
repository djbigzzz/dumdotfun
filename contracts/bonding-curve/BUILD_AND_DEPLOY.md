# Build and Deploy Bonding Curve Program

The Solana BPF compiler requires significant resources. Build the program on a local machine with Solana CLI + Anchor CLI installed.

## Prerequisites

- Rust 1.85+ (`rustup install 1.85.0`)
- Solana CLI 1.17.31+ (`sh -c "$(curl -sSfL https://release.anza.xyz/v1.17.31/install)"`)
- Anchor CLI 0.30.0 (`cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked --tag v0.30.0`)

## Build

```bash
cd contracts/bonding-curve
anchor build
```

The compiled program will be at `target/deploy/bonding_curve.so`.

## Deploy to Devnet

Set the deployer keypair (must be the program's upgrade authority):

```bash
solana config set --url devnet
solana config set --keypair /path/to/authority-keypair.json
```

Deploy (or upgrade) the program:

```bash
# First deployment:
solana program deploy target/deploy/bonding_curve.so --program-id 6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh

# Upgrade existing deployment:
solana program deploy target/deploy/bonding_curve.so --program-id 6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh --upgrade-authority /path/to/authority-keypair.json
```

## Program Details

- **Program ID**: `6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh`
- **Authority**: `G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM`
- **Network**: Devnet

## New Instructions Added

### withdraw_liquidity

Withdraws all SOL + tokens from a graduated bonding curve for DEX migration.

- Only callable by platform authority
- Requires `is_graduated == true` on the bonding curve
- Transfers SOL from curve vault to destination wallet
- Mints remaining curve tokens to destination token account
- Zeros out real reserves (prevents double withdrawal)

Accounts:
1. `authority` (signer) - Platform authority
2. `mint` (mut) - Token mint
3. `bonding_curve` (mut, PDA) - Bonding curve state
4. `curve_sol_vault` (mut, PDA) - SOL vault
5. `platform_config` (PDA) - Platform config
6. `destination` (mut) - SOL destination wallet
7. `destination_token_account` (mut) - Token destination (ATA)
8. `system_program`
9. `token_program`
10. `associated_token_program`

Instruction discriminator: SHA256("global:withdraw_liquidity")[0..8]
