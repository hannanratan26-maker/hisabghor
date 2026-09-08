import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PING_INTERVAL = 30 * 1000; // 30 seconds

export default function usePresence() {
  useEffect(() => {
    const ping = async () => {
      try {
        await base44.auth.updateMe({ last_active: new Date().toISOString() });
      } catch (e) {}
    };

    ping(); // immediate ping on mount
    const interval = setInterval(ping, PING_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}