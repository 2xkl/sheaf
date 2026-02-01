import { useEffect, useState } from 'react';
import { FileText, Upload, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { docsApi, type DocumentList } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DocumentList | null>(null);

  useEffect(() => {
    docsApi.list(0, 5).then((r) => setData(r.data));
  }, []);

  const totalSize = data?.items.reduce((s, d) => s + d.size_bytes, 0) ?? 0;
  const totalDownloads = data?.items.reduce((s, d) => s + d.download_count, 0) ?? 0;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">
        Witaj, {user?.username}
      </h2>
      <p className="text-(--color-text-muted) text-sm mb-8">
        Oto podsumowanie Twoich dokumentow
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={FileText} label="Dokumenty" value={data?.total ?? 0} />
        <StatCard
          icon={Upload}
          label="Rozmiar"
          value={formatBytes(totalSize)}
        />
        <StatCard icon={Download} label="Pobrania" value={totalDownloads} />
      </div>

      <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl">
        <div className="px-5 py-4 border-b border-(--color-border) flex items-center justify-between">
          <h3 className="font-semibold text-sm">Ostatnie dokumenty</h3>
          <button
            onClick={() => navigate('/documents')}
            className="text-xs text-(--color-primary) hover:underline cursor-pointer"
          >
            Zobacz wszystkie
          </button>
        </div>
        {data?.items.length === 0 ? (
          <div className="p-8 text-center text-(--color-text-muted) text-sm">
            Nie masz jeszcze zadnych dokumentow.{' '}
            <button
              onClick={() => navigate('/upload')}
              className="text-(--color-primary) hover:underline cursor-pointer"
            >
              Wrzuc pierwszego PDFa
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
                    {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                    {doc.is_public && (
                      <span className="ml-2 text-(--color-success)">publiczny</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-(--color-text-muted)">
                  {doc.download_count} pobran
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
