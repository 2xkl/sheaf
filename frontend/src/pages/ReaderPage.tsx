import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Loader2,
  AlertTriangle,
  Maximize,
  Minimize,
  WifiOff,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import api, { docsApi, progressApi, type Document as DocType } from '../lib/api';
import { useOfflineContext } from '../context/OfflineContext';
import { offlineDb } from '../lib/offlineDb';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ReaderPage() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { isOnline, isDocumentOffline, getOfflinePdf, saveProgressOffline } = useOfflineContext();

  const [doc, setDoc] = useState<DocType | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [immersive, setImmersive] = useState(false);
  const [isLoadedOffline, setIsLoadedOffline] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<ReturnType<pdfjsLib.PDFPageProxy['render']> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(page);
  const numPagesRef = useRef(numPages);

  pageRef.current = page;
  numPagesRef.current = numPages;

  const canFullscreen = typeof document.documentElement.requestFullscreen === 'function';

  const enterFullscreen = useCallback(() => {
    setImmersive(true);
    if (canFullscreen && wrapperRef.current) {
      wrapperRef.current.requestFullscreen().catch(() => {});
    }
  }, [canFullscreen]);

  const exitFullscreen = useCallback(() => {
    setImmersive(false);
    if (canFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [canFullscreen]);

  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        setImmersive(false);
      }
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const handleCanvasTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (e.target === containerRef.current || e.target === canvasRef.current) {
        if (immersive) {
          exitFullscreen();
        } else {
          enterFullscreen();
        }
      }
    },
    [immersive, enterFullscreen, exitFullscreen]
  );

  // Load PDF document
  useEffect(() => {
    if (!docId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        let pdfData: ArrayBuffer;
        let docData: DocType;
        const isAvailableOffline = isDocumentOffline(docId);

        if (!isOnline && !isAvailableOffline) {
          throw new Error('Document not available offline');
        }

        if (!isOnline || (!navigator.onLine && isAvailableOffline)) {
          // Load from IndexedDB
          const offlinePdf = await getOfflinePdf(docId);
          if (!offlinePdf) {
            throw new Error('Offline document not found');
          }
          pdfData = offlinePdf;

          const offlineDoc = await offlineDb.documents.get(docId);
          if (!offlineDoc) {
            throw new Error('Offline document metadata not found');
          }
          docData = offlineDoc as DocType;
          setIsLoadedOffline(true);
        } else {
          // Load from API
          const [docRes, pdfRes] = await Promise.all([
            docsApi.get(docId),
            api.get(`/documents/${docId}/view`, { responseType: 'arraybuffer' }),
          ]);
          docData = docRes.data;
          pdfData = pdfRes.data;
        }

        if (cancelled) return;

        setDoc(docData);

        const pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        if (cancelled) return;

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);

        // Try to get progress from API
        let startPage = 1;
        if (isOnline) {
          try {
            const progRes = await progressApi.get(docId);
            if (progRes.data && progRes.data.current_page > 0) {
              startPage = Math.min(progRes.data.current_page, pdfDoc.numPages);
            }
          } catch {
            // Progress not available
          }
        }

        setPage(startPage);

        if (isOnline) {
          progressApi.save(docId, startPage, pdfDoc.numPages).catch(() => {});
        }

        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load PDF';
        console.error('ReaderPage load error:', err);
        setError(msg);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docId, navigate, isOnline, isDocumentOffline, getOfflinePdf]);

  // Render current page to canvas
  useEffect(() => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas || numPages === 0) return;

    let cancelled = false;

    (async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      setRendering(true);

      try {
        const pdfPage = await pdfDoc.getPage(page);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale });
        const ctx = canvas.getContext('2d')!;

        const dpr = window.devicePixelRatio || 1;

        canvas.width = viewport.width * dpr;
        canvas.height = viewport.height * dpr;

        const container = containerRef.current;
        const maxDisplayWidth = container ? container.clientWidth - 32 : viewport.width;
        const displayWidth = Math.min(viewport.width, maxDisplayWidth);
        const displayScale = displayWidth / viewport.width;
        const displayHeight = viewport.height * displayScale;

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderTask = pdfPage.render({ canvasContext: ctx, viewport } as never);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) setRendering(false);
      } catch (err: unknown) {
        if (!cancelled && err instanceof Error && err.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, scale, numPages]);

  // Save progress (debounced)
  const saveProgress = useCallback(() => {
    if (!docId || numPagesRef.current === 0) return;

    if (isOnline) {
      progressApi.save(docId, pageRef.current, numPagesRef.current).catch(() => {
        // If API fails, queue for later
        saveProgressOffline(docId, pageRef.current, numPagesRef.current);
      });
    } else {
      // Offline: queue for sync
      saveProgressOffline(docId, pageRef.current, numPagesRef.current);
    }
  }, [docId, isOnline, saveProgressOffline]);

  useEffect(() => {
    if (numPages === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveProgress, 1000);
  }, [page, numPages, saveProgress]);

  // Save on unmount + cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveProgress();
      if (renderTaskRef.current) renderTaskRef.current.cancel();
      if (pdfDocRef.current) pdfDocRef.current.destroy();
    };
  }, [saveProgress]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPage((p) => Math.min(numPagesRef.current, p + 1));
      } else if (e.key === 'Escape' && immersive) {
        exitFullscreen();
      } else if (e.key === 'f' || e.key === 'F') {
        if (immersive) exitFullscreen();
        else enterFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [immersive, enterFullscreen, exitFullscreen]);

  // Swipe navigation on mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) {
        setPage((p) => Math.min(numPagesRef.current, p + 1));
      } else {
        setPage((p) => Math.max(1, p - 1));
      }
    }
  };

  const goBack = () => {
    saveProgress();
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="w-10 h-10 text-danger" />
        <p className="text-text text-center font-medium">Failed to load PDF</p>
        <p className="text-text-muted text-sm text-center max-w-md">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 px-4 py-2 bg-primary text-white rounded hover:opacity-90 transition-opacity"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="bg-bg flex flex-col" style={{ height: '100dvh' }}>
      {/* Top toolbar */}
      <div
        className={`bg-bg-card border-b border-border flex items-center px-3 md:px-4 gap-2 md:gap-4 shrink-0 transition-all duration-300 overflow-hidden ${
          immersive ? 'max-h-0 border-b-0' : 'max-h-20'
        }`}
        style={
          !immersive
            ? { paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: '3rem' }
            : { minHeight: 0 }
        }
      >
        <button
          onClick={goBack}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <span className="text-sm font-medium text-text truncate flex-1">
          {doc?.original_name ?? 'PDF'}
        </span>

        {(isLoadedOffline || !isOnline) && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Offline</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-sm text-text-muted">
          <span className="hidden sm:inline">
            {page} / {numPages}
          </span>
          <span className="sm:hidden text-xs">
            {page}/{numPages}
          </span>
        </div>

        <button
          onClick={enterFullscreen}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
          title="Focus mode (F)"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* PDF canvas — tap to toggle toolbars */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex justify-center items-start py-4 bg-neutral-800 relative cursor-pointer"
        onClick={handleCanvasTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {rendering && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        <canvas ref={canvasRef} />

        {/* Immersive mode: floating page indicator */}
        {immersive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            {page} / {numPages}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div
        className={`bg-bg-card border-t border-border flex items-center justify-center gap-2 md:gap-4 shrink-0 px-3 md:px-4 transition-all duration-300 overflow-hidden ${
          immersive ? 'max-h-0 border-t-0' : 'max-h-20'
        }`}
        style={
          !immersive
            ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)', minHeight: '3rem' }
            : { minHeight: 0 }
        }
      >
        {/* Zoom controls */}
        <button
          onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xs text-text-muted w-10 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border mx-1 md:mx-2" />

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
            className="w-12 text-center text-sm bg-bg-input border border-border rounded px-1 py-0.5 text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs md:text-sm text-text-muted">of {numPages}</span>
        </div>

        <button
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-border mx-1 md:mx-2" />

        <button
          onClick={exitFullscreen}
          className="p-1.5 rounded hover:bg-bg transition-colors text-text-muted hover:text-text md:hidden"
          title="Exit focus mode"
        >
          <Minimize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
