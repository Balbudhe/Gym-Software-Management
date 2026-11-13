import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OnlineStatus() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-amber-950">
      <WifiOff size={14} />
      You are offline. Some actions may not work until you reconnect.
    </div>
  );
}
