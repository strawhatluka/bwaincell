'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center gap-3">
      <WifiOff className="w-5 h-5 text-yellow-600" />
      <p className="text-sm text-yellow-800">
        You're offline. Viewing cached data. Changes will sync when you reconnect.
      </p>
    </div>
  );
}
