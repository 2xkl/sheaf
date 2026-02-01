import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { docsApi } from '../lib/api';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | undefined) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      await docsApi.upload(file, isPublic);
      setResult('success');
      setFile(null);
    } catch {
      setResult('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Upload PDF</h2>
      <p className="text-sm text-(--color-text-muted) mb-8">
        Przeciagnij plik lub kliknij, zeby wybrac
      </p>

      <div className="max-w-xl">
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-(--color-primary) bg-(--color-primary-light)'
              : 'border-(--color-border) hover:border-(--color-primary)/50 hover:bg-(--color-bg-card)'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText size={40} className="text-(--color-primary)" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-(--color-text-muted)">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={40} className="text-(--color-text-muted)" />
              <p className="text-(--color-text-muted)">
                Przeciagnij PDF tutaj lub kliknij
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded accent-(--color-primary)"
            />
            Dokument publiczny
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-4 w-full py-2.5 rounded-lg bg-(--color-primary) text-white font-medium hover:bg-(--color-primary-hover) transition-colors disabled:opacity-50 cursor-pointer"
        >
          {uploading ? 'Wysylanie...' : 'Wyslij PDF'}
        </button>

        {result === 'success' && (
          <div className="mt-4 p-3 rounded-lg bg-(--color-success)/10 text-(--color-success) text-sm flex items-center gap-2">
            <CheckCircle size={18} /> PDF zostal przeslany pomyslnie
          </div>
        )}
        {result === 'error' && (
          <div className="mt-4 p-3 rounded-lg bg-(--color-danger)/10 text-(--color-danger) text-sm flex items-center gap-2">
            <XCircle size={18} /> Blad podczas wysylania pliku
          </div>
        )}
      </div>
    </div>
  );
}
