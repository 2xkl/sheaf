import { useEffect, useState } from 'react';
import { FileText, Upload, Download, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { docsApi, progressApi, type DocumentList, type ReadingProgress, type Document } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DocumentList | null>(null);
  const [recentReads, setRecentReads] = useState<(ReadingProgress & { doc?: Document })[]>([]);

  useEffect(() => {
    docsApi.list(0, 5).then((r) => setData(r.data));
    progressApi.list().then(async (r) => {
      const reads = r.data;
      const enriched = await Promise.all(
        reads.map(async (p) => {
          try {
            const docRes = await docsApi.get(p.document_id);
            return { ...p, doc: docRes.data };
          } catch {
            return { ...p };
          }
        }),
      );
      enriched.sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime());
      setRecentReads(enriched);
    });
  }, []);

  const totalSize = data?.items.reduce((s, d) => s + d.size_bytes, 0) ?? 0;
  const totalDownloads = data?.items.reduce((s, d) => s + d.download_count, 0) ?? 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">
        Welcome, {user?.username}
      </h2>
      <p className="text-(--color-text-muted) text-sm mb-8">
        Here's a summary of your documents
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={FileText} label="Documents" value={data?.total ?? 0} />
        <StatCard
          icon={Upload}
          label="Size"
          value={formatBytes(totalSize)}
        />
        <StatCard icon={Download} label="Downloads" value={totalDownloads} />
      </div>

      {recentReads.length > 0 && (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl mb-8">
          <div className="px-5 py-4 border-b border-(--color-border) flex items-center gap-2">
            <BookOpen size={16} className="text-(--color-primary)" />
            <h3 className="font-semibold text-sm">Continue reading</h3>
          </div>
          <div className="divide-y divide-(--color-border)">
            {recentReads.map((r) => (
              <button
                key={r.document_id}
                onClick={() => navigate(`/read/${r.document_id}`)}
                className="w-full px-4 md:px-5 py-3 flex items-center gap-3 md:gap-4 hover:bg-(--color-bg-sidebar) transition-colors text-left cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {r.doc?.original_name ?? r.document_id}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-(--color-border) rounded-full overflow-hidden max-w-[200px]">
                      <div
                        className="h-full bg-(--color-primary) rounded-full"
                        style={{
                          width: `${Math.round((r.current_page / r.total_pages) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-(--color-text-muted) whitespace-nowrap">
                      p. {r.current_page} / {r.total_pages}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-(--color-text-muted) whitespace-nowrap hidden sm:block">
                  {new Date(r.last_read_at).toLocaleDateString('en-US')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl">
        <div className="px-5 py-4 border-b border-(--color-border) flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recent documents</h3>
          <button
            onClick={() => navigate('/documents')}
            className="text-xs text-(--color-primary) hover:underline cursor-pointer"
          >
            View all
          </button>
        </div>
        {data?.items.length === 0 ? (
          <div className="p-8 text-center text-(--color-text-muted) text-sm">
            You don't have any documents yet.{' '}
            <button
              onClick={() => navigate('/upload')}
              className="text-(--color-primary) hover:underline cursor-pointer"
            >
              Upload your first PDF
            </button>
          </div>
        ) : (
          <div className="divide-y divide-(--color-border)">
            {data?.items.map((doc) => (
              <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.original_name}</p>
                  <p className="text-xs text-(--color-text-muted)">
                    {formatBytes(doc.size_bytes)} &middot;{' '}
                    {new Date(doc.created_at).toLocaleDateString('en-US')}
                    {doc.is_public && (
                      <span className="ml-2 text-(--color-success)">public</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-(--color-text-muted)">
                  {doc.download_count} downloads
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-(--color-primary-light)">
          <Icon size={18} />
        </div>
        <span className="text-sm text-(--color-text-muted)">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
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
