import { useEffect, useState } from 'react';
import { HardDrive, Cloud, Loader2 } from 'lucide-react';
import { settingsApi, type StorageSettingsUpdate } from '../lib/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [backend, setBackend] = useState('local');
  const [accountName, setAccountName] = useState('');
  const [accountKey, setAccountKey] = useState('');
  const [containerName, setContainerName] = useState('');
  const [connectionStringSet, setConnectionStringSet] = useState(false);

  useEffect(() => {
    settingsApi
      .getStorage()
      .then((r) => {
        setBackend(r.data.storage_backend);
        setConnectionStringSet(r.data.azure_connection_string_set);
        setContainerName(r.data.azure_container_name ?? '');
      })
      .catch(() => setError('Failed to load storage settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload: StorageSettingsUpdate = {
        storage_backend: backend,
        azure_container_name: containerName || null,
      };
      if (accountName && accountKey) {
        payload.azure_account_name = accountName;
        payload.azure_account_key = accountKey;
      }

      const { data } = await settingsApi.updateStorage(payload);
      setConnectionStringSet(data.azure_connection_string_set);
      setContainerName(data.azure_container_name ?? '');
      setAccountName('');
      setAccountKey('');
      setSuccess('Storage settings saved');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } }).response?.data
          ?.detail || 'Failed to save settings';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-(--color-primary)" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Settings</h2>
      <p className="text-(--color-text-muted) text-sm mb-8">
        Configure your storage backend
      </p>

      <form onSubmit={handleSave}>
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-5 md:p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-(--color-danger)/10 text-(--color-danger) text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-(--color-success)/10 text-(--color-success) text-sm">
              {success}
            </div>
          )}

          {/* Backend selection */}
          <div>
            <label className="block text-sm font-medium mb-3 text-(--color-text-muted)">
              Storage backend
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBackend('local')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer text-left ${
                  backend === 'local'
                    ? 'border-(--color-primary) bg-(--color-primary-light)'
                    : 'border-(--color-border) hover:border-(--color-text-muted)'
                }`}
              >
                <HardDrive size={20} />
                <div>
                  <p className="text-sm font-medium">Local</p>
                  <p className="text-xs text-(--color-text-muted)">
                    Server filesystem
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setBackend('azure')}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors cursor-pointer text-left ${
                  backend === 'azure'
                    ? 'border-(--color-primary) bg-(--color-primary-light)'
                    : 'border-(--color-border) hover:border-(--color-text-muted)'
                }`}
              >
                <Cloud size={20} />
                <div>
                  <p className="text-sm font-medium">Azure Blob Storage</p>
                  <p className="text-xs text-(--color-text-muted)">
                    Cloud storage
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Azure fields */}
          {backend === 'azure' && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-(--color-text-muted)">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={
                    connectionStringSet
                      ? 'Leave blank to keep current'
                      : 'Storage account name'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-input) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/40 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-(--color-text-muted)">
                  Access Key
                </label>
                <input
                  type="password"
                  value={accountKey}
                  onChange={(e) => setAccountKey(e.target.value)}
                  placeholder={
                    connectionStringSet
                      ? 'Leave blank to keep current'
                      : 'Account access key'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-input) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/40 transition"
                />
                <p
                  className={`text-xs mt-1.5 ${
                    connectionStringSet
                      ? 'text-(--color-success)'
                      : 'text-(--color-text-muted)'
                  }`}
                >
                  {connectionStringSet
                    ? 'Credentials configured'
                    : 'No credentials configured'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-(--color-text-muted)">
                  Container Name
                </label>
                <input
                  type="text"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  placeholder="e.g. sheaf-pdfs"
                  required={backend === 'azure'}
                  className="w-full px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-bg-input) text-(--color-text) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/40 transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-(--color-primary) text-white font-medium hover:bg-(--color-primary-hover) transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
