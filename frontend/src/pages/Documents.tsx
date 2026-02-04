import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, Globe, Lock, Copy, Check, BookOpen, WifiOff } from 'lucide-react';
import { docsApi, type Document } from '../lib/api';
import { useOfflineContext } from '../context/OfflineContext';
import SaveOfflineButton from '../components/SaveOfflineButton';

export default function Documents() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const { isOnline, offlineDocuments, isDocumentOffline } = useOfflineContext();

  const load = () => {
    if (!isOnline) {
      const offlineDocs = offlineDocuments.map((od) => ({
        ...od,
        download_count: 0,
      }));
      setDocs(offlineDocs);
      setTotal(offlineDocs.length);
      return;
    }

    docsApi.list(0, 200).then((r) => {
      setDocs(r.data.items);
      setTotal(r.data.total);
    });
  };

  useEffect(load, [isOnline, offlineDocuments]);

  const handleDownload = async (doc: Document) => {
    const { data } = await docsApi.download(doc.id);
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.original_name;
    a.click();
    URL.revokeObjectURL(url);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    await docsApi.delete(id);
    load();
  };

  const handleCopyLink = (doc: Document) => {
    const url = `${window.location.origin}/api/public/${doc.id}/download`;
    navigator.clipboard.writeText(url);
    setCopied(doc.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Documents</h2>
          <p className="text-sm text-(--color-text-muted)">
            {total} files
            {!isOnline && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                <WifiOff size={12} /> Offline mode
              </span>
            )}
          </p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-12 text-center">
          <p className="text-(--color-text-muted)">
            {isOnline ? 'No documents' : 'No offline documents'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block bg-(--color-bg-card) border border-(--color-border) rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-border) text-left text-(--color-text-muted)">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Size</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Downloads</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border)">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-(--color-bg-sidebar) transition-colors">
                    <td className="px-5 py-3 max-w-[250px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/read/${doc.id}`)}
                          className="font-medium truncate block text-left hover:text-(--color-primary) transition-colors cursor-pointer"
                        >
                          {doc.original_name}
                        </button>
                        {isDocumentOffline(doc.id) && (
                          <span
                            className="shrink-0 inline-flex items-center gap-1 text-xs text-green-500"
                            title="Available offline"
                          >
                            <WifiOff size={12} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-(--color-text-muted)">
                      {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-5 py-3 text-(--color-text-muted)">
                      {new Date(doc.created_at).toLocaleDateString('en-US')}
                    </td>
                    <td className="px-5 py-3">
                      {doc.is_public ? (
                        <span className="inline-flex items-center gap-1 text-xs text-(--color-success)">
                          <Globe size={14} /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-(--color-text-muted)">
                          <Lock size={14} /> Private
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-(--color-text-muted)">{doc.download_count}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isOnline && <SaveOfflineButton document={doc} />}
                        {doc.is_public && (
                          <button
                            onClick={() => handleCopyLink(doc)}
                            title="Copy link"
                            className="p-1.5 rounded-lg text-(--color-text-muted) hover:bg-(--color-bg) transition-colors cursor-pointer"
                          >
                            {copied === doc.id ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/read/${doc.id}`)}
                          title="Read"
                          className="p-1.5 rounded-lg text-(--color-text-muted) hover:text-(--color-accent) hover:bg-(--color-accent)/10 transition-colors cursor-pointer"
                        >
                          <BookOpen size={16} />
                        </button>
                        {isOnline && (
                          <>
                            <button
                              onClick={() => handleDownload(doc)}
                              title="Download"
                              className="p-1.5 rounded-lg text-(--color-text-muted) hover:text-(--color-primary) hover:bg-(--color-primary-light) transition-colors cursor-pointer"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-(--color-text-muted) hover:text-(--color-danger) hover:bg-(--color-danger)/10 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-4"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/read/${doc.id}`)}
                    className="text-sm font-medium truncate block text-left hover:text-(--color-primary) transition-colors cursor-pointer flex-1"
                  >
                    {doc.original_name}
                  </button>
                  {isDocumentOffline(doc.id) && (
                    <span className="shrink-0 text-green-500" title="Available offline">
                      <WifiOff size={14} />
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-(--color-text-muted)">
                  <span>{formatBytes(doc.size_bytes)}</span>
                  <span>{new Date(doc.created_at).toLocaleDateString('en-US')}</span>
                  {doc.is_public ? (
                    <span className="inline-flex items-center gap-1 text-(--color-success)">
                      <Globe size={12} /> Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Lock size={12} /> Private
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/read/${doc.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-(--color-primary-light) text-(--color-primary) cursor-pointer"
                  >
                    <BookOpen size={14} /> Read
                  </button>
                  {isOnline && (
                    <>
                      <SaveOfflineButton document={doc} variant="full" />
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-(--color-bg) text-(--color-text-muted) cursor-pointer"
                      >
                        <Download size={14} /> Download
                      </button>
                    </>
                  )}
                  {doc.is_public && (
                    <button
                      onClick={() => handleCopyLink(doc)}
                      className="p-2 rounded-lg text-(--color-text-muted) hover:bg-(--color-bg) transition-colors cursor-pointer"
                      title="Copy link"
                    >
                      {copied === doc.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                  {isOnline && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 rounded-lg text-(--color-text-muted) hover:text-(--color-danger) transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
