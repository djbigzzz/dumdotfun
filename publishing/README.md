# Dum.fun - Solana dApp Store Publishing

## Quick Start

### Prerequisites
- Node.js 18+
- A Solana keypair (with SOL on mainnet for minting NFTs)
- Android SDK Build Tools (for APK validation)
- The signed release APK

### 1. Install CLI Tools

```bash
cd publishing
npm init -y
npm install --save-dev @solana-mobile/dapp-store-cli
```

### 2. Generate a Signing Key (for the APK)

IMPORTANT: Use a NEW key exclusively for the dApp Store (not a Google Play key).

```bash
keytool -genkey -v -keystore dappstore.keystore \
  -alias dumfun -keyalg RSA -keysize 2048 -validity 10000
```

### 3. Build the Release APK

From the project root:

```bash
npm run build && npx cap sync
cd android
./gradlew assembleRelease
```

Copy the APK to publishing directory:
```bash
cp android/app/build/outputs/apk/release/app-release.apk publishing/app-release.apk
```

### 4. Prepare Media Assets

Place these files in `publishing/media/`:
- `publisher-icon.png` (512x512) - Your publisher logo
- `app-icon-512.png` (512x512) - App icon
- `banner.png` (1200x600) - Store banner
- `screenshot-tokens.png` (1080x1920 min) - Token listing page
- `screenshot-predictions.png` (1080x1920 min) - Predictions page
- `screenshot-create.png` (1080x1920 min) - Token creation page
- `screenshot-privacy.png` (1080x1920 min) - Privacy mode

Take screenshots on a real device using:
```bash
adb exec-out screencap -p > screenshot-tokens.png
```

### 5. Validate Configuration

```bash
npx dapp-store validate \
  -k /path/to/your-keypair.json \
  -b /path/to/android/sdk/build-tools/33.0.0
```

### 6. Mint NFTs (on Mainnet)

You need SOL on mainnet for these transactions.

```bash
# Mint Publisher NFT (one-time)
npx dapp-store create publisher \
  -k /path/to/your-keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Mint App NFT (one-time)
npx dapp-store create app \
  -k /path/to/your-keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Mint Release NFT
npx dapp-store create release \
  -k /path/to/your-keypair.json \
  -b /path/to/android/sdk/build-tools/33.0.0 \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### 7. Submit for Review

```bash
npx dapp-store publish submit \
  -k /path/to/your-keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_KEY \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

### 8. After Submission

1. Join Solana Mobile Discord: https://discord.gg/solanamobile
2. Get the developer role in #developer channel
3. Post in #dapp-store that you've submitted for review
4. Review typically takes 2-3 days for new apps

## Updating the App

For subsequent releases:

```bash
# Build new APK, copy to publishing/
# Update version in config.yaml

npx dapp-store create release \
  -k /path/to/keypair.json \
  -b /path/to/build-tools \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

npx dapp-store publish update \
  -k /path/to/keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_KEY \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

Update reviews typically take ~1 day.
