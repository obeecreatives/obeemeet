import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallPlatform = 'chromium' | 'ios' | 'macos-safari' | 'desktop-other';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('desktop-other');

  useEffect(() => {
    const checkStandalone = () => {
      const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standaloneMedia || iosStandalone);
    };

    checkStandalone();

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (/macintosh/.test(ua) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1);
    const isMacSafari =
      !isIOSDevice && /macintosh/.test(ua) && /safari/.test(ua) && !/chrome|chromium|edg|firefox/.test(ua);

    if (isIOSDevice) {
      setPlatform('ios');
    } else if (isMacSafari) {
      setPlatform('macos-safari');
    } else {
      setPlatform('desktop-other');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('chromium');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = () => checkStandalone();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleMediaChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleMediaChange);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS: platform === 'ios',
    platform,
    install,
  };
}
