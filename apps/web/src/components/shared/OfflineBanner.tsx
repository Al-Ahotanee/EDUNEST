import React from 'react';
import { useSyncStatus } from '../../lib/syncEngine';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { syncEngine } from '../../lib/syncEngine';

export function OfflineBanner() {
  const { isOnline, pending, failed } = useSyncStatus();

  if (isOnline && pending === 0 && failed === 0) return null;

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-slide-in',
      !isOnline ? 'bg-slate-900 text-white' : failed > 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
    )}>
      {!isOnline ? (
        <>
          <WifiOff size={16} />
          <span>Offline Mode — changes saved locally</span>
        </>
      ) : failed > 0 ? (
        <>
          <AlertCircle size={16} />
          <span>{failed} sync failed</span>
          <button onClick={() => syncEngine.retryFailed()} className="underline hover:no-underline ml-1">
            Retry
          </button>
        </>
      ) : (
        <>
          <RefreshCw size={16} className="animate-spin" />
          <span>{pending} pending sync{pending !== 1 ? 's' : ''}</span>
        </>
      )}
    </div>
  );
}

export function SyncStatusIndicator() {
  const { isOnline, pending, failed } = useSyncStatus();

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-red-500')} />
      <span className={isOnline ? 'text-emerald-600' : 'text-red-500'}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {pending > 0 && <span className="badge-yellow">{pending} pending</span>}
      {failed > 0 && <span className="badge-red">{failed} failed</span>}
    </div>
  );
}
