import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  offlineDb,
  saveDocumentForOffline,
  getOfflineDocument,
  removeOfflineDocument,
  queueProgressUpdate,
  getOfflineStorageUsage,
  type OfflineDocument,
} from '../lib/offlineDb';
import { syncPendingProgress, getPendingSyncCount } from '../lib/offlineSync';
import api, { type Document } from '../lib/api';

export interface UseOfflineReturn {
  isOnline: boolean;
  offlineDocIds: string[];
  offlineDocuments: OfflineDocument[];
  isDocumentOffline: (docId: string) => boolean;
  saveOffline: (doc: Document) => Promise<void>;
  removeOffline: (docId: string) => Promise<void>;
  getOfflinePdf: (docId: string) => Promise<ArrayBuffer | null>;
  saveProgressOffline: (docId: string, currentPage: number, totalPages: number) => Promise<void>;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  storageUsage: { documentCount: number; totalBytes: number };
  isSaving: string | null;
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState({ documentCount: 0, totalBytes: 0 });

  const offlineDocuments = useLiveQuery(
    () => offlineDb.documents.orderBy('savedAt').reverse().toArray(),
    [],
    []
  );

  const offlineDocIds = offlineDocuments?.map((d) => d.id) ?? [];

  const syncAttempted = useRef(false);

  const syncNow = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!navigator.onLine || isSyncing) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await syncPendingProgress();
      setPendingSyncCount(await getPendingSyncCount());
      return { synced: result.synced, failed: result.failed };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!syncAttempted.current) {
        syncAttempted.current = true;
        syncNow();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getPendingSyncCount();
      setPendingSyncCount(count);
    };
    updateCount();

    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateUsage = async () => {
      const usage = await getOfflineStorageUsage();
      setStorageUsage(usage);
    };
    updateUsage();
  }, [offlineDocuments]);

  const isDocumentOffline = useCallback(
    (docId: string): boolean => {
      return offlineDocIds.includes(docId);
    },
    [offlineDocIds]
  );

  const saveOffline = useCallback(async (doc: Document): Promise<void> => {
    setIsSaving(doc.id);
    try {
      const response = await api.get(`/documents/${doc.id}/view`, {
        responseType: 'arraybuffer',
      });

      await saveDocumentForOffline(doc, response.data);
    } finally {
      setIsSaving(null);
    }
  }, []);

  const removeOffline = useCallback(async (docId: string): Promise<void> => {
    await removeOfflineDocument(docId);
  }, []);

  const getOfflinePdf = useCallback(async (docId: string): Promise<ArrayBuffer | null> => {
    const result = await getOfflineDocument(docId);
    return result?.pdfData ?? null;
  }, []);

  const saveProgressOffline = useCallback(
    async (docId: string, currentPage: number, totalPages: number): Promise<void> => {
      await queueProgressUpdate(docId, currentPage, totalPages);
      setPendingSyncCount(await getPendingSyncCount());
    },
    []
  );

  return {
    isOnline,
    offlineDocIds,
    offlineDocuments: offlineDocuments ?? [],
    isDocumentOffline,
    saveOffline,
    removeOffline,
    getOfflinePdf,
    saveProgressOffline,
    pendingSyncCount,
    isSyncing,
    syncNow,
    storageUsage,
    isSaving,
  };
}
