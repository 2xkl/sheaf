import { useEffect, useState } from 'react';
import { Users, FileText, HardDrive, Download } from 'lucide-react';
import { adminApi, type Stats } from '../lib/api';

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminApi.stats().then((r) => setStats(r.data));
  }, []);

  if (!stats) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Statystyki</h2>
      <p className="text-sm text-(--color-text-muted) mb-8">
        Ogolny przeglad platformy
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Users} label="Uzytkownicy" value={stats.users} />
        <Card icon={FileText} label="Dokumenty" value={stats.documents} />
        <Card icon={HardDrive} label="Storage" value={formatBytes(stats.total_size_bytes)} />
        <Card icon={Download} label="Pobrania" value={stats.total_downloads} />
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-(--color-primary-light)">
          <Icon size={20} />
        </div>
        <span className="text-sm text-(--color-text-muted)">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
