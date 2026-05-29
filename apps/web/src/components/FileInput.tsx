'use client';

import { useRef, useState } from 'react';
import type { GalleryImage } from './ConverterTabs';

interface Props {
  sessionId: string | null;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

export default function FileInput({ sessionId, onConversionComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of files) formData.append('files', file);
      if (sessionId) formData.append('sessionId', sessionId);

      const res = await fetch('/api/convert/file', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const data = (await res.json()) as {
        sessionId: string;
        results: { imageId: string; filename: string }[];
      };

      const images: GalleryImage[] = data.results.map((r) => ({
        imageId: r.imageId,
        label: r.filename,
      }));
      onConversionComplete(data.sessionId, images);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="converter-input" onSubmit={handleSubmit}>
      <div>
        <label className="converter-input__label">Upload HTML files</label>
        <div
          className="converter-input__file-area"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".html,.htm"
            onChange={handleFileChange}
          />
          <div>Click to select files</div>
          <div className="converter-input__file-hint">.html and .htm files only</div>
        </div>
        {files.length > 0 && (
          <div className="converter-input__selected-files">
            {files.length} file{files.length !== 1 ? 's' : ''} selected:{' '}
            {files.map((f) => f.name).join(', ')}
          </div>
        )}
      </div>

      {error && <div className="converter-input__error">{error}</div>}

      <div className="converter-input__actions">
        <button type="submit" className="btn btn--primary" disabled={loading || files.length === 0}>
          {loading ? (
            <>
              <span className="spinner" /> Converting…
            </>
          ) : (
            `Convert ${files.length > 0 ? files.length : ''} File${files.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </form>
  );
}
