import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isMobile = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const initMobileApp = async (): Promise<void> => {
  if (!isMobile()) return;

  try {
    await SplashScreen.hide();
    
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#18181b' });
      await StatusBar.setStyle({ style: Style.Dark });
    }

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    App.addListener('appUrlOpen', (event) => {
      const url = event.url;
      if (url.includes('dum.fun') || url.includes('solana:')) {
        const path = url.split('/').slice(3).join('/');
        if (path) {
          window.location.href = `/${path}`;
        }
      }
    });
  } catch (error) {
    console.error('Error initializing mobile app:', error);
  }
};

export const openExternalLink = async (url: string): Promise<void> => {
  if (isMobile()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};

export const getMobileWalletDeepLink = (action: 'connect' | 'sign', data?: string): string => {
  const baseUrl = 'phantom://';
  
  switch (action) {
    case 'connect':
      return `${baseUrl}connect?app_url=${encodeURIComponent(window.location.origin)}&dapp_encryption_public_key=`;
    case 'sign':
      return `${baseUrl}signTransaction?payload=${encodeURIComponent(data || '')}`;
    default:
      return baseUrl;
  }
};
