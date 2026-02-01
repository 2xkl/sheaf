import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import api, { docsApi, progressApi, type Document as DocType } from '../lib/api';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function ReaderPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  const [doc, setDoc] = useState<DocType | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(page);
  const numPagesRef = useRef(numPages);

  pageRef.current = page;
  numPagesRef.current = numPages;

  // Load document metadata, progress, and PDF data
  useEffect(() => {
    if (!docId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    Promise.all([
      docsApi.get(docId),
      progressApi.get(docId),
      api.get(`/documents/${docId}/view`, { responseType: 'blob' }),
    ]).then(
      ([docRes, progRes, pdfRes]) => {
        setDoc(docRes.data);
        if (progRes.data && progRes.data.current_page > 0) {
          setPage(progRes.data.current_page);
        }
        const blob = new Blob([pdfRes.data], { type: 'application/pdf' });
        setPdfUrl(URL.createObjectURL(blob));
        setLoading(false);
      },
    );
  }, [docId, navigate]);

  // Save progress (debounced)
  const saveProgress = useCallback(() => {
    if (!docId || numPagesRef.current === 0) return;
    progressApi.save(docId, pageRef.current, numPagesRef.current).catch(() => {});
  }, [docId]);

  // Debounce page change saves
  useEffect(() => {
    if (numPages === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveProgress, 1000);
  }, [page, numPages, saveProgress]);

  // Save on unmount + revoke blob URL
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveProgress();
    };
  }, [saveProgress]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPage((p) => Math.min(numPagesRef.current, p + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const goBack = () => {
    saveProgress();
    navigate(-1);
  };

  if (loading || !docId || !pdfUrl) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top toolbar */}
      <div className="h-12 bg-bg-card border-b border-border flex items-center px-4 gap-4 shrink-0">
        <button
          onClick={goBack}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-medium text-text truncate flex-1">
          {doc?.original_name ?? 'PDF'}
        </span>

        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>
            {page} / {numPages}
          </span>
        </div>
      </div>

      {/* PDF content */}
      <div className="flex-1 overflow-auto flex justify-center py-4">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          }
          error={
            <div className="text-danger text-center py-20">
              Failed to load PDF
            </div>
          }
        >
          <Page
            pageNumber={page}
            scale={scale}
            loading={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            }
          />
        </Document>
      </div>

      {/* Bottom toolbar */}
      <div className="h-12 bg-bg-card border-t border-border flex items-center justify-center gap-4 shrink-0 px-4">
        {/* Zoom controls */}
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xs text-text-muted w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Page navigation */}
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={numPages}
            value={page}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v >= 1 && v <= numPages) setPage(v);
            }}
            className="w-14 text-center text-sm bg-bg-input border border-border rounded px-1 py-0.5 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-sm text-text-muted">of {numPages}</span>
        </div>

        <button
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
