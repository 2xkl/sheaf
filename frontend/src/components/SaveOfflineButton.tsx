import { Download, Check, Loader2 } from 'lucide-react';
import { useOfflineContext } from '../context/OfflineContext';
import type { Document } from '../lib/api';

interface SaveOfflineButtonProps {
  document: Document;
  variant?: 'icon' | 'full';
  className?: string;
}

export default function SaveOfflineButton({
  document,
  variant = 'icon',
  className = '',
}: SaveOfflineButtonProps) {
  const { isDocumentOffline, saveOffline, removeOffline, isSaving } = useOfflineContext();

  const isOffline = isDocumentOffline(document.id);
  const isSavingThis = isSaving === document.id;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isSavingThis) return;

    if (isOffline) {
      await removeOffline(document.id);
    } else {
      await saveOffline(document);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isSavingThis}
        title={isOffline ? 'Remove offline copy' : 'Save for offline'}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          isOffline
            ? 'text-green-500 hover:text-red-500 hover:bg-red-500/10'
            : 'text-(--color-text-muted) hover:text-(--color-primary) hover:bg-(--color-primary)/10'
        } ${className}`}
      >
        {isSavingThis ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isOffline ? (
          <Check size={16} />
        ) : (
          <Download size={16} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isSavingThis}
      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium cursor-pointer ${
        isOffline ? 'bg-green-500/10 text-green-600' : 'bg-(--color-bg) text-(--color-text-muted)'
      } ${className}`}
    >
      {isSavingThis ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Saving...
        </>
      ) : isOffline ? (
        <>
          <Check size={14} />
          Saved
        </>
      ) : (
        <>
          <Download size={14} />
          Save offline
        </>
      )}
    </button>
  );
}
