'use client';

import { useEffect, useRef, useState } from 'react';
import type { GalleryImage, OutputFormat, Viewport } from './ConverterTabs';
import Terminal from './Terminal';
import { useSSEStream } from '@/hooks/useSSEStream';

interface Props {
  sessionId: string | null;
  viewport: Viewport;
  fullPage: boolean;
  format: OutputFormat;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

export default function FileInput({ sessionId, viewport, fullPage, format, onConversionComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const { lines, loading, setLoading, addLine, reset, runStream } = useSSEStream();
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && lines.length > 0) {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, lines.length]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setLoading(true);
    reset();
    try {
      const formData = new FormData();
      for (const file of files) formData.append('files', file);
      if (sessionId) formData.append('sessionId', sessionId);
      formData.append('viewport', JSON.stringify(viewport));
      formData.append('fullPage', String(fullPage));
      formData.append('format', format);

      const res = await fetch('/api/convert/file', { method: 'POST', body: formData });
      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try { const d = (await res.json()) as { error?: string }; if (d.error) message = d.error; } catch {}
        addLine({ message, status: 'error' });
        return;
      }
      await runStream(res, (data) => {
        const d = data as { sessionId: string; results: { imageId: string; filename: string }[] };
        onConversionComplete(d.sessionId, d.results.map((r) => ({ imageId: r.imageId, label: r.filename })));
        setFiles([]);
        if (inputRef.current) inputRef.current.value = '';
      });
    } catch (err) {
      addLine({ message: err instanceof Error ? err.message : 'Conversion failed', status: 'error' });
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
          <input ref={inputRef} type="file" multiple accept=".html,.htm" onChange={handleFileChange} />
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

      <div ref={terminalRef}>
        <Terminal lines={lines} running={loading} />
      </div>

      <div className="converter-input__actions">
        <button type="submit" className="btn btn--primary" disabled={loading || files.length === 0}>
          {loading ? (
            <><span className="spinner" /> Converting…</>
          ) : (
            `Convert ${files.length > 0 ? files.length : ''} File${files.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </form>
  );
}
