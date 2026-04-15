'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent {
  preventDefault: () => void;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as unknown as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    globalThis.window?.addEventListener('beforeinstallprompt', handler as EventListener);

    return () =>
      globalThis.window?.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPrompt(null);
    }
  };

  return { isInstallable, promptInstall };
}
