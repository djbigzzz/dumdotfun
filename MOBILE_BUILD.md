# Dum.fun Mobile App Build Guide

## Overview
This project uses Capacitor to wrap the React web app as a native Android APK for the Solana dApp Store.

## Prerequisites
- Android Studio (for local development)
- Java JDK 17+
- Android SDK

## Build Commands

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

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release APK
```bash
cd android && ./gradlew assembleRelease
```

## Capacitor Configuration

Config file: `capacitor.config.ts`
- App ID: `fun.dum.app`
- App Name: `Dum.fun`
- Web Directory: `dist/public`

## Solana Mobile Integration

The app includes `@solana-mobile/wallet-adapter-mobile` for native Solana wallet support on mobile devices (Saga, etc.).

### Mobile Wallet Detection
The wallet adapter automatically detects if running on a mobile device and uses the appropriate wallet connection method.

## Updating the Mobile App

After making changes to the web app:
1. Run `npm run build` to build the web app
2. Run `npx cap sync` to sync changes to Android
3. Rebuild the APK or run in Android Studio

## Solana dApp Store Submission

1. Build a release APK with proper signing
2. Test on a Solana Mobile device (Saga)
3. Submit to the Solana dApp Store following their guidelines

## Troubleshooting

### Build fails
- Ensure Android SDK is installed
- Check Java version (JDK 17+)
- Run `npx cap sync` to ensure web assets are copied

### Wallet not connecting
- Ensure the mobile wallet app is installed
- Check that the app is running on a real device (not emulator for wallet testing)
