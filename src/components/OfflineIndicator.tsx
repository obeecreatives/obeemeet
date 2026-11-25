import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-slate-950/95 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
      <span>Koneksi internet terputus — Menunggu jaringan kembali aktif</span>
    </div>
  );
}
