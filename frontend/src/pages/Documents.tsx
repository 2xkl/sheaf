import { useEffect, useState } from 'react';
import { Download, Trash2, Globe, Lock, Copy, Check } from 'lucide-react';
import { docsApi, type Document } from '../lib/api';

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    docsApi.list(0, 200).then((r) => {
      setDocs(r.data.items);
      setTotal(r.data.total);
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
    if (!confirm('Na pewno usunac ten dokument?')) return;
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
          <h2 className="text-2xl font-bold">Dokumenty</h2>
          <p className="text-sm text-(--color-text-muted)">{total} plikow</p>
        </div>
      </div>

      {docs.length === 0 ? (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-12 text-center">
          <p className="text-(--color-text-muted)">Brak dokumentow</p>
        </div>
      ) : (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-left text-(--color-text-muted)">
                <th className="px-5 py-3 font-medium">Nazwa</th>
                <th className="px-5 py-3 font-medium">Rozmiar</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Pobrania</th>
                <th className="px-5 py-3 font-medium text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-(--color-bg-sidebar) transition-colors">
                  <td className="px-5 py-3 font-medium max-w-[250px] truncate">
                    {doc.original_name}
                  </td>
                  <td className="px-5 py-3 text-(--color-text-muted)">
                    {formatBytes(doc.size_bytes)}
                  </td>
                  <td className="px-5 py-3 text-(--color-text-muted)">
                    {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="px-5 py-3">
                    {doc.is_public ? (
                      <span className="inline-flex items-center gap-1 text-xs text-(--color-success)">
                        <Globe size={14} /> Publiczny
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-(--color-text-muted)">
                        <Lock size={14} /> Prywatny
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-(--color-text-muted)">{doc.download_count}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {doc.is_public && (
                        <button
                          onClick={() => handleCopyLink(doc)}
                          title="Kopiuj link"
                          className="p-1.5 rounded-lg text-(--color-text-muted) hover:bg-(--color-bg) transition-colors cursor-pointer"
                        >
                          {copied === doc.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Pobierz"
                        className="p-1.5 rounded-lg text-(--color-text-muted) hover:text-(--color-primary) hover:bg-(--color-primary-light) transition-colors cursor-pointer"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Usun"
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
