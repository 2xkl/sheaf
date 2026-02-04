import { progressApi } from './api';
import {
  getPendingProgressUpdates,
  clearPendingProgress,
  type PendingProgressSync,
} from './offlineDb';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export async function syncPendingProgress(): Promise<SyncResult> {
  const pending = await getPendingProgressUpdates();

  if (pending.length === 0) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const results: { item: PendingProgressSync; success: boolean; error?: string }[] = [];

  for (const item of pending) {
    try {
      await progressApi.save(item.documentId, item.currentPage, item.totalPages);
      results.push({ item, success: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ item, success: false, error: errorMsg });
    }
  }

  const syncedIds = results
    .filter((r) => r.success && r.item.id !== undefined)
    .map((r) => r.item.id!);

  if (syncedIds.length > 0) {
    await clearPendingProgress(syncedIds);
  }

  return {
    synced: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    errors: results.filter((r) => !r.success).map((r) => r.error!),
  };
}

export async function hasPendingSync(): Promise<boolean> {
  const pending = await getPendingProgressUpdates();
  return pending.length > 0;
}

export async function getPendingSyncCount(): Promise<number> {
  const pending = await getPendingProgressUpdates();
  return pending.length;
}
