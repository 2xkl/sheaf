import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Loader2 } from 'lucide-react';
import { searchApi, type SearchResultItem } from '../lib/api';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const { data } = await searchApi.search(query.trim());
      setResults(data.items);
      setTotal(data.total);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Search</h2>
        <p className="text-sm text-(--color-text-muted)">
          Search in document contents (OCR extracted text)
        </p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-text-muted)" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 bg-(--color-bg-input) border border-(--color-border) rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-(--color-primary) text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>
      </form>

      {searched && (
        <div className="text-sm text-(--color-text-muted) mb-4">
          {total} result{total !== 1 ? 's' : ''} for "{query}"
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              onClick={() => navigate(`/read/${result.id}`)}
              className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-4 cursor-pointer hover:border-(--color-primary) transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-(--color-primary-light) rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-(--color-primary)" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{result.original_name}</h3>
                  <p
                    className="text-xs text-(--color-text-muted) mt-1 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searched && !loading ? (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-12 text-center">
          <Search className="w-12 h-12 text-(--color-text-muted) mx-auto mb-3 opacity-50" />
          <p className="text-(--color-text-muted)">No documents found</p>
          <p className="text-xs text-(--color-text-muted) mt-1">
            Try different keywords or run OCR on your documents first
          </p>
        </div>
      ) : !searched ? (
        <div className="bg-(--color-bg-card) border border-(--color-border) rounded-xl p-12 text-center">
          <Search className="w-12 h-12 text-(--color-text-muted) mx-auto mb-3 opacity-50" />
          <p className="text-(--color-text-muted)">Enter a search query</p>
          <p className="text-xs text-(--color-text-muted) mt-1">
            Search in documents that have been processed with OCR
          </p>
        </div>
      ) : null}
    </div>
  );
}
