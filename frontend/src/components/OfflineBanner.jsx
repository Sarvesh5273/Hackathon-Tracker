import React from 'react';
import useOnlineStatus from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div style={{ background: '#f59e0b', color: '#000' }} className="fixed inset-x-0 top-0 z-50 py-2 text-center text-sm font-semibold">
      Offline Mode - Data may be stale
    </div>
  );
}
