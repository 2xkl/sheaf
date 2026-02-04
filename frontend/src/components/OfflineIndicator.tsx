import { WifiOff, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useOfflineContext } from '../context/OfflineContext';

export default function OfflineIndicator() {
  const { isOnline, pendingSyncCount, isSyncing, syncNow } = useOfflineContext();
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  if (isOnline && pendingSyncCount === 0 && !syncResult) {
    return null;
  }

  const handleSync = async () => {
    const result = await syncNow();
    setSyncResult(result);
    setTimeout(() => setSyncResult(null), 3000);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
      <div
        className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border
        ${
          isOnline
            ? 'bg-(--color-bg-card) border-(--color-border)'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
        }
      `}
      >
        {!isOnline ? (
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : pendingSyncCount > 0 ? (
          <CloudOff className="w-5 h-5 text-(--color-text-muted) shrink-0" />
        ) : syncResult ? (
          syncResult.failed > 0 ? (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <Check className="w-5 h-5 text-green-500 shrink-0" />
          )
        ) : null}

        <div className="flex-1 min-w-0">
          {!isOnline ? (
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              You're offline
            </p>
          ) : syncResult ? (
            <p className="text-sm">
              {syncResult.failed > 0
                ? `Synced ${syncResult.synced}, ${syncResult.failed} failed`
                : `${syncResult.synced} items synced`}
            </p>
          ) : (
            <p className="text-sm text-(--color-text-muted)">
              {pendingSyncCount} pending {pendingSyncCount === 1 ? 'update' : 'updates'}
            </p>
          )}

          {!isOnline && pendingSyncCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingSyncCount} changes will sync when online
            </p>
          )}
        </div>

        {isOnline && pendingSyncCount > 0 && !syncResult && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
              bg-(--color-primary) text-white hover:opacity-90
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>
    </div>
  );
}
