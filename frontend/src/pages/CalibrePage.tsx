import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Download,
  Loader2,
  Server,
  HardDrive,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { calibreApi, type CalibreBook, type CalibreStatus } from '../lib/api';

export default function CalibrePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CalibreStatus | null>(null);
  const [books, setBooks] = useState<CalibreBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [source, setSource] = useState<'all' | 'local' | 'server'>('all');

  const loadStatus = async () => {
    try {
      const { data } = await calibreApi.status();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  };

  const loadBooks = async () => {
    setLoading(true);
    try {
      const { data } = await calibreApi.books(100, 0, source);
      setBooks(data.items);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [source]);

  const handleImport = async (book: CalibreBook) => {
    if (importing) return;

    const format = book.formats.includes('PDF')
      ? 'PDF'
      : book.formats.includes('EPUB')
        ? 'EPUB'
        : book.formats[0];

    if (!format) {
      alert('No supported format available');
      return;
    }

    setImporting(book.id);
    try {
      const { data } = await calibreApi.import(book.id, format);
      alert(`Imported: ${data.original_name}`);
      navigate('/');
    } catch (err) {
      alert('Failed to import book');
    } finally {
      setImporting(null);
    }
  };

  const ConnectionStatus = ({ connected, label }: { connected: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {connected ? (
        <CheckCircle className="w-4 h-4 text-(--color-success)" />
      ) : (
        <XCircle className="w-4 h-4 text-(--color-text-muted)" />
      )}
      <span className={connected ? 'text-(--color-success)' : 'text-(--color-text-muted)'}>
        {label}
      </span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Calibre</h2>
          <p className="text-sm text-(--color-text-muted)">Import books from Calibre library</p>
        </div>
        <button
          onClick={() => {
            loadStatus();
            loadBooks();
          }}
          className="p-2 rounded-lg hover:bg-(--color-bg) transition-colors text-(--color-text-muted)"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Connection status */}
      {status && (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium mb-3">Connection Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--color-bg) rounded-lg">
                <HardDrive className="w-5 h-5 text-(--color-text-muted)" />
              </div>
              <div>
                <ConnectionStatus
                  connected={status.local_connected}
                  label={status.local_connected ? 'Local library connected' : 'Local library not configured'}
                />
                {status.local_connected && (
                  <p className="text-xs text-(--color-text-muted)">{status.local_book_count} books</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-(--color-bg) rounded-lg">
                <Server className="w-5 h-5 text-(--color-text-muted)" />
              </div>
              <div>
                <ConnectionStatus
                  connected={status.server_connected}
                  label={status.server_connected ? 'Content Server connected' : 'Content Server not configured'}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Source filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'local', 'server'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              source === s
                ? 'bg-(--color-primary) text-white'
                : 'bg-(--color-bg) text-(--color-text-muted) hover:bg-(--color-bg-card)'
            }`}
          >
            {s === 'all' ? 'All' : s === 'local' ? 'Local' : 'Server'}
          </button>
        ))}
      </div>

      {/* Books list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-(--color-primary) animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-(--color-text-muted) mx-auto mb-3 opacity-50" />
          <p className="text-(--color-text-muted)">No books found</p>
          <p className="text-xs text-(--color-text-muted) mt-1">
            Configure Calibre library path or Content Server URL in environment variables
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((book) => (
            <div
              key={book.id}
              className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-4"
            >
              <div className="flex gap-3">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-16 h-24 object-cover rounded-lg bg-(--color-bg)"
                  />
                ) : (
                  <div className="w-16 h-24 bg-(--color-bg) rounded-lg flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-(--color-text-muted)" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2">{book.title}</h3>
                  {book.authors.length > 0 && (
                    <p className="text-xs text-(--color-text-muted) mt-1 truncate">
                      {book.authors.join(', ')}
                    </p>
                  )}
                  {book.series && (
                    <p className="text-xs text-(--color-text-muted) truncate">
                      {book.series}
                      {book.series_index ? ` #${book.series_index}` : ''}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {book.formats.slice(0, 3).map((fmt) => (
                      <span
                        key={fmt}
                        className="px-1.5 py-0.5 text-xs bg-(--color-bg) rounded"
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                  <span className="inline-block mt-2 px-1.5 py-0.5 text-xs bg-(--color-primary-light) text-(--color-primary) rounded">
                    {book.source}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleImport(book)}
                disabled={importing === book.id || book.formats.length === 0}
                className="w-full mt-3 py-2 bg-(--color-primary) text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing === book.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Import to Sheaf
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
