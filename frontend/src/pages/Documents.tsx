import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, Globe, Lock, Copy, Check, BookOpen } from 'lucide-react';
import { docsApi, progressApi, type Document, type ReadingProgress } from '../lib/api';

export default function Documents() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, ReadingProgress>>({});

  const load = () => {
    docsApi.list(0, 200).then((r) => {
      setDocs(r.data.items);
      setTotal(r.data.total);
    });
    progressApi.list().then((r) => {
      const map: Record<string, ReadingProgress> = {};
      r.data.forEach((p) => (map[p.document_id] = p));
      setProgress(map);
    });
  };

  useEffect(load, []);

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
          <p className="text-sm text-(--color-text-muted)">{total} files</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-12 text-center">
          <p className="text-(--color-text-muted)">No documents</p>
        </div>
      ) : (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl overflow-hidden">
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
                    <button
                      onClick={() => navigate(`/read/${doc.id}`)}
                      className="font-medium truncate block text-left hover:text-(--color-primary) transition-colors cursor-pointer"
                    >
                      {doc.original_name}
                    </button>
                    {progress[doc.id] && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-(--color-border) rounded-full overflow-hidden">
                          <div
                            className="h-full bg-(--color-primary) rounded-full transition-all"
                            style={{
                              width: `${Math.round((progress[doc.id].current_page / progress[doc.id].total_pages) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-(--color-text-muted) whitespace-nowrap">
                          {progress[doc.id].current_page}/{progress[doc.id].total_pages}
                        </span>
                      </div>
                    )}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
