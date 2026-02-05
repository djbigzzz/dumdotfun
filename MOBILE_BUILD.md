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

### Build Release APK
For release builds, you need to configure signing:

1. Generate a keystore:
```bash
keytool -genkey -v -keystore dum-fun-release.keystore -alias dum-fun -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle` with signing config or use environment variables

3. Build release:
```bash
cd android && ./gradlew assembleRelease
```

## Capacitor Configuration

Config file: `capacitor.config.ts`

| Setting | Value |
|---------|-------|
| App ID | `fun.dum.app` |
| App Name | `Dum.fun` |
| Web Directory | `dist/public` |
| Android Scheme | `https` |

## Project Structure

```
android/                      # Native Android project
  app/
    src/main/
      assets/public/          # Web assets (synced from dist/public)
      java/                   # Native Android code
      res/                    # Android resources
capacitor.config.ts           # Capacitor configuration
client/src/lib/
  wallet-context.tsx          # Wallet provider with mobile support
  mobile-utils.ts             # Mobile detection utilities
```

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

### Known Limitations
- Full transaction lifecycle (blockhash, confirmations) should be tested on real devices
- MWA connection lifecycle requires testing with actual Saga device
- Consider using `@solana/wallet-adapter-react` providers for production-ready integration

## Solana dApp Store Submission

1. Build a signed release APK
2. Test thoroughly on Solana Mobile device (Saga)
3. Prepare store listing assets:
   - App icon (512x512)
   - Screenshots (phone and tablet)
   - App description
4. Submit to Solana dApp Store following their guidelines

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
