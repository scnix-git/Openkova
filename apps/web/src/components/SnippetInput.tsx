'use client';

import { useEffect, useRef } from 'react';
import type { GalleryImage, OutputFormat, Viewport } from './ConverterTabs';
import Terminal from './Terminal';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useState } from 'react';

interface Props {
  sessionId: string | null;
  viewport: Viewport;
  fullPage: boolean;
  format: OutputFormat;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

const PLACEHOLDER = `<h1 style="font-family: sans-serif; color: #7c6af7;">Hello, Openkova!</h1>
<p style="font-family: sans-serif; color: #666;">Paste any HTML here to convert it to an image.</p>`;

export default function SnippetInput({ sessionId, viewport, fullPage, format, onConversionComplete }: Props) {
  const [html, setHtml] = useState('');
  const { lines, loading, setLoading, addLine, reset, runStream } = useSSEStream();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && lines.length > 0) {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, lines.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = html.trim();
    if (!trimmed) return;
    setLoading(true);
    reset();
    try {
      const res = await fetch('/api/convert/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: trimmed, sessionId, viewport, fullPage, format }),
      });
      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try { const d = (await res.json()) as { error?: string }; if (d.error) message = d.error; } catch {}
        addLine({ message, status: 'error' });
        return;
      }
      await runStream(res, (data) => {
        const d = data as { sessionId: string; imageId: string };
        onConversionComplete(d.sessionId, [{ imageId: d.imageId, label: 'snippet' }]);
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
        <label className="converter-input__label" htmlFor="snippet-textarea">
          Paste your HTML
        </label>
        <textarea
          id="snippet-textarea"
          className="converter-input__textarea"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
        />
      </div>

      <div ref={terminalRef}>
        <Terminal lines={lines} running={loading} />
      </div>

      <div className="converter-input__actions">
        <button type="submit" className="btn btn--primary" disabled={loading || !html.trim()}>
          {loading ? <><span className="spinner" /> Converting…</> : 'Convert to Image'}
        </button>
      </div>
    </form>
  );
}
