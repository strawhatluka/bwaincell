'use client';

import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(globalThis.navigator?.onLine ?? true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    globalThis.window?.addEventListener('online', handleOnline);
    globalThis.window?.addEventListener('offline', handleOffline);

    return () => {
      globalThis.window?.removeEventListener('online', handleOnline);
      globalThis.window?.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
