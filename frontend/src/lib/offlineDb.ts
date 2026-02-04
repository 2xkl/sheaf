import Dexie, { type EntityTable } from 'dexie';

export interface OfflineDocument {
  id: string;
  filename: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  storage_backend: string;
  is_public: boolean;
  download_count: number;
  created_at: string;
  owner_id: string;
  savedAt: number;
}

export interface OfflinePdf {
  documentId: string;
  pdfData: ArrayBuffer;
  savedAt: number;
}

export interface PendingProgressSync {
  id?: number;
  documentId: string;
  currentPage: number;
  totalPages: number;
  updatedAt: number;
}

class SheafOfflineDb extends Dexie {
  documents!: EntityTable<OfflineDocument, 'id'>;
  pdfs!: EntityTable<OfflinePdf, 'documentId'>;
  pendingProgress!: EntityTable<PendingProgressSync, 'id'>;

  constructor() {
    super('sheaf-offline');

    this.version(1).stores({
      documents: 'id, savedAt, original_name',
      pdfs: 'documentId',
      pendingProgress: '++id, documentId, updatedAt',
    });
  }
}

export const offlineDb = new SheafOfflineDb();

export async function saveDocumentForOffline(
  document: Omit<OfflineDocument, 'savedAt'>,
  pdfData: ArrayBuffer
): Promise<void> {
  const savedAt = Date.now();

  await offlineDb.transaction('rw', [offlineDb.documents, offlineDb.pdfs], async () => {
    await offlineDb.documents.put({
      ...document,
      savedAt,
    });
    await offlineDb.pdfs.put({
      documentId: document.id,
      pdfData,
      savedAt,
    });
  });
}

export async function getOfflineDocument(
  documentId: string
): Promise<{ document: OfflineDocument; pdfData: ArrayBuffer } | null> {
  const document = await offlineDb.documents.get(documentId);
  const pdf = await offlineDb.pdfs.get(documentId);

  if (!document || !pdf) {
    return null;
  }

  return { document, pdfData: pdf.pdfData };
}

export async function removeOfflineDocument(documentId: string): Promise<void> {
  await offlineDb.transaction('rw', [offlineDb.documents, offlineDb.pdfs], async () => {
    await offlineDb.documents.delete(documentId);
    await offlineDb.pdfs.delete(documentId);
  });
}

export async function getAllOfflineDocumentIds(): Promise<string[]> {
  const docs = await offlineDb.documents.toArray();
  return docs.map((d) => d.id);
}

export async function getOfflineStorageUsage(): Promise<{
  documentCount: number;
  totalBytes: number;
}> {
  const docs = await offlineDb.documents.toArray();
  const totalBytes = docs.reduce((sum, d) => sum + d.size_bytes, 0);
  return {
    documentCount: docs.length,
    totalBytes,
  };
}

export async function queueProgressUpdate(
  documentId: string,
  currentPage: number,
  totalPages: number
): Promise<void> {
  await offlineDb.transaction('rw', offlineDb.pendingProgress, async () => {
    await offlineDb.pendingProgress.where('documentId').equals(documentId).delete();

    await offlineDb.pendingProgress.add({
      documentId,
      currentPage,
      totalPages,
      updatedAt: Date.now(),
    });
  });
}

export async function getPendingProgressUpdates(): Promise<PendingProgressSync[]> {
  return offlineDb.pendingProgress.orderBy('updatedAt').toArray();
}

export async function clearPendingProgress(ids: number[]): Promise<void> {
  await offlineDb.pendingProgress.bulkDelete(ids);
}
