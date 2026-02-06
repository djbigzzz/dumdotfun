# Dum.fun Mobile App Build Guide

## Overview
This project uses Capacitor to wrap the React web app as a native Android APK for the Solana dApp Store.

## Architecture
- **Framework**: Capacitor 8.x wraps the Vite/React web app
- **Wallet**: @solana-mobile/wallet-adapter-mobile for native Mobile Wallet Adapter (MWA) protocol
- **Platform**: Android (Solana dApp Store targets Android devices)

## Mobile Wallet Integration

The app uses `@solana-mobile/wallet-adapter-mobile` for native Solana wallet support:

```typescript
// Mobile adapter is automatically used on mobile devices
// Key files:
// - client/src/lib/wallet-context.tsx - Wallet provider with mobile support
// - client/src/lib/mobile-utils.ts - Mobile detection and utilities
```

**How it works:**
1. On mobile devices, the app detects the mobile environment
2. Creates a `SolanaMobileWalletAdapter` instance
3. Uses the MWA protocol to connect to native Solana wallets (Phantom, Solflare, etc.)
4. Falls back to browser-based Phantom on desktop

## Prerequisites

For building the APK:
- Android Studio (for local development)
- Java JDK 17+
- Android SDK (API 33+)
- Node.js 18+

## Build Commands

### Development (Web)
```bash
npm run dev
```

### Sync Web Assets to Android
```bash
npm run build && npx cap sync
```

### Open in Android Studio
```bash
npx cap open android
```

### Build Debug APK (command line)
```bash
npm run build && npx cap sync && cd android && ./gradlew assembleDebug
```

The debug APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release APK for dApp Store

**IMPORTANT:** The Solana dApp Store requires a SEPARATE signing key from Google Play.

1. Generate a dApp Store signing key:
```bash
keytool -genkey -v -keystore dappstore.keystore \
  -alias dumfun -keyalg RSA -keysize 2048 -validity 10000
```

2. Add signing config to `android/app/build.gradle`:
```groovy
android {
    signingConfigs {
        release {
            storeFile file('../../dappstore.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''
            keyAlias 'dumfun'
            keyPassword System.getenv('KEY_PASSWORD') ?: ''
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

3. Build the signed release APK:
```bash
npm run build && npx cap sync
cd android && ./gradlew assembleRelease
```

4. The signed APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Capacitor Configuration

Config file: `capacitor.config.ts`

| Setting | Value |
|---------|-------|
| App ID | `fun.dum.app` |
| App Name | `Dum.fun` |
| Web Directory | `dist/public` |
| Android Scheme | `https` |

## Deep Linking

The app handles three URL schemes:
- `dumfun://` - Custom scheme for app-to-app linking
- `https://dum.fun` - Web links that open in the app
- `solana:` - Solana wallet callback URLs

Configured in `android/app/src/main/AndroidManifest.xml`.

## Project Structure

```
android/                      # Native Android project
  app/
    src/main/
      assets/public/          # Web assets (synced from dist/public)
      java/                   # Native Android code
      res/                    # Android resources (icons, splash)
publishing/                   # Solana dApp Store publishing files
  config.yaml                 # dApp Store configuration
  media/                      # Store listing assets
  README.md                   # Publishing step-by-step guide
capacitor.config.ts           # Capacitor configuration
client/src/lib/
  wallet-context.tsx          # Wallet provider with mobile support
  mobile-utils.ts             # Mobile detection utilities
client/src/pages/
  legal.tsx                   # Privacy Policy, EULA, Copyright pages
```

---

## Solana dApp Store Submission

### What You Need

1. **Signed release APK** (built with a dApp Store-exclusive signing key)
2. **Solana keypair** with SOL on mainnet (for minting NFTs)
3. **Android SDK Build Tools** (for APK validation)
4. **Legal pages** (already built into the app):
   - Privacy Policy: `/legal/privacy`
   - EULA: `/legal/eula`
   - Copyright: `/legal/copyright`

### Step-by-Step Submission

#### 1. Install the dApp Store CLI

```bash
cd publishing
npm init -y
npm install --save-dev @solana-mobile/dapp-store-cli
```

#### 2. Copy the Release APK

```bash
cp android/app/build/outputs/apk/release/app-release.apk publishing/app-release.apk
```

#### 3. Take Screenshots

Install the APK on a device and take screenshots:
```bash
adb exec-out screencap -p > publishing/media/screenshot-tokens.png
# Navigate to different pages and capture more screenshots
adb exec-out screencap -p > publishing/media/screenshot-predictions.png
adb exec-out screencap -p > publishing/media/screenshot-create.png
adb exec-out screencap -p > publishing/media/screenshot-privacy.png
```

Minimum 4 screenshots, at least 1080x1920 resolution.

#### 4. Review config.yaml

Edit `publishing/config.yaml` to fill in:
- Your publisher email
- Update URLs once your domain is live
- Verify app descriptions

#### 5. Validate

```bash
cd publishing
npx dapp-store validate \
  -k /path/to/your-keypair.json \
  -b /path/to/android/sdk/build-tools/33.0.0
```

#### 6. Mint NFTs on Mainnet

These cost a small amount of SOL (< 0.01 SOL total):

```bash
# Publisher NFT (one-time)
npx dapp-store create publisher \
  -k /path/to/your-keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# App NFT (one-time)
npx dapp-store create app \
  -k /path/to/your-keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# Release NFT (per version)
npx dapp-store create release \
  -k /path/to/your-keypair.json \
  -b /path/to/android/sdk/build-tools/33.0.0 \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
```

#### 7. Submit for Review

```bash
npx dapp-store publish submit \
  -k /path/to/your-keypair.json \
  -u https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY \
  --requestor-is-authorized \
  --complies-with-solana-dapp-store-policies
```

#### 8. After Submission

1. Join Solana Mobile Discord: https://discord.gg/solanamobile
2. Get the developer role in #developer channel
3. Post in #dapp-store that you've submitted
4. Reviews take 2-3 days for new apps, ~1 day for updates

### Publishing Updates

```bash
# Build new APK, copy to publishing/
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

---

## Testing Mobile Wallet

1. Build and install APK on Android device
2. Ensure a Solana mobile wallet is installed (Phantom, Solflare)
3. Open app and tap "Connect Wallet"
4. MWA protocol will launch the wallet app for authorization

## Platform Support & Limitations

### Android
- Full MWA support on Android Chrome and native apps
- Works with Phantom, Solflare, and other MWA-compatible wallets

### iOS
- **MWA is NOT supported on iOS** due to background execution limitations
- iOS users should use Safari with Phantom browser extension
- Or use Phantom's in-app browser

### Current Implementation Status
- Desktop: Full Phantom browser extension support
- Android native: SolanaMobileWalletAdapter integration (requires testing on device)
- Mobile web (Android Chrome): MWA support via adapter
- iOS: Fallback to Phantom download prompt

## Troubleshooting

### Build fails
- Ensure Android SDK is installed with API 33+
- Check Java version: `java -version` (need JDK 17+)
- Run `npx cap sync` to ensure web assets are copied

### Wallet not connecting on mobile
- Ensure a MWA-compatible wallet app is installed
- Test on a real device (not emulator)
- Check that HTTPS is properly configured

### White screen on app launch
- Check if web assets are synced: `npx cap sync`
- Verify `dist/public` contains built assets
- Check Android logs: `adb logcat | grep -i capacitor`

### dApp Store CLI errors
- Ensure Node.js 18+ is installed
- Check your keypair has SOL on mainnet
- Verify Android Build Tools path is correct
- Run `npx dapp-store validate` to check for issues
