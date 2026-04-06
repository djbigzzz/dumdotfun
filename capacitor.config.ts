import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'fun.dum.app',
  appName: 'Dum.fun',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: isProd
      ? 'https://dum.fun'
      : undefined,
    cleartext: false,
    hostname: 'dum.fun',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#18181b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#18181b',
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
    includePlugins: [
      '@capacitor/app',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
    ],
  },
};

export default config;
