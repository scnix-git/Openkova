'use client';

import { useEffect, useRef, useState } from 'react';
import type { GalleryImage, Viewport } from './ConverterTabs';
import Terminal, { type LogLine } from './Terminal';
import { parseSSEStream } from '@/lib/sse';

interface Props {
  sessionId: string | null;
  viewport: Viewport;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

export default function FileInput({ sessionId, viewport, onConversionComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && lines.length > 0) {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

  function addLine(line: LogLine) {
    setLines((prev) => [...prev, line]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files ?? []));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setLines([]);

    try {
      const formData = new FormData();
      for (const file of files) formData.append('files', file);
      if (sessionId) formData.append('sessionId', sessionId);
      formData.append('viewport', JSON.stringify(viewport));

      const res = await fetch('/api/convert/file', { method: 'POST', body: formData });

      if (!res.ok || !res.body) {
        let message = `Server error ${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {}
        addLine({ message, status: 'error' });
        return;
      }

      let gotDone = false;
      for await (const event of parseSSEStream(res.body)) {
        if (event.type === 'progress') {
          addLine({ message: event.message, status: 'progress' });
        } else if (event.type === 'done') {
          gotDone = true;
          addLine({ message: event.message, status: 'done' });
          const data = event.data as {
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
        } else if (event.type === 'error') {
          addLine({ message: event.message, status: 'error' });
          return;
        }
      }
      if (!gotDone) addLine({ message: 'Conversion failed unexpectedly', status: 'error' });
    } catch (err) {
      addLine({
        message: err instanceof Error ? err.message : 'Conversion failed',
        status: 'error',
      });
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

      <div ref={terminalRef}>
        <Terminal lines={lines} running={loading} />
      </div>

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
