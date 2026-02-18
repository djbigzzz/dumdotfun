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
      try {
        // Validate deep link paths — block javascript:, data:, and external URLs
        const isSafePath = (p: string) =>
          p.startsWith('/') && !p.includes('://') && !p.toLowerCase().startsWith('/javascript:') && !p.toLowerCase().startsWith('/data:');

        if (url.startsWith('dumfun://open/')) {
          const path = url.replace('dumfun://open', '');
          if (path && isSafePath(path)) window.location.href = path;
        } else if (url.startsWith('https://dum.fun')) {
          const parsed = new URL(url);
          if (parsed.pathname && parsed.pathname !== '/' && isSafePath(parsed.pathname)) {
            // Only allow safe query parameters — strip anything that could be injected
            const safeSearch = parsed.search.replace(/[<>"']/g, '');
            window.location.href = parsed.pathname + safeSearch;
          }
        }
        // solana: and solana-wallet callbacks are handled natively
      } catch (err) {
        console.error('Failed to handle deep link:', err);
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

export const hapticFeedback = (style: 'light' | 'medium' | 'heavy' = 'medium'): void => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[style]);
  }
};

export const shareContent = async (data: {
  title: string;
  text?: string;
  url?: string;
}): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
      return false;
    }
  }

  if (data.url) {
    try {
      const nav = globalThis.navigator as Navigator & { clipboard?: { writeText(text: string): Promise<void> } };
      if (nav?.clipboard) {
        await nav.clipboard.writeText(data.url);
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
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
