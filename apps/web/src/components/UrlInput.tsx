'use client';

import { useEffect, useRef, useState } from 'react';
import type { GalleryImage, OutputFormat, Viewport } from './ConverterTabs';
import Terminal from './Terminal';
import { useSSEStream } from '@/hooks/useSSEStream';
import { PAGE_SIZE } from '@/lib/config';

interface Props {
  sessionId: string | null;
  viewport: Viewport;
  fullPage: boolean;
  format: OutputFormat;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

export default function UrlInput({ sessionId, viewport, fullPage, format, onConversionComplete }: Props) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [totalDiscovered, setTotalDiscovered] = useState(0);
  const [capturedCount, setCapturedCount] = useState(0);
  const { lines, loading, setLoading, addLine, reset, runStream } = useSSEStream();
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && lines.length > 0) {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, lines.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    reset();
    setRemaining([]);
    setTotalDiscovered(0);
    setCapturedCount(0);
    try {
      const res = await fetch('/api/convert/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, sessionId, depth, viewport, fullPage, format }),
      });
      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try { const d = (await res.json()) as { error?: string }; if (d.error) message = d.error; } catch {}
        addLine({ message, status: 'error' });
        return;
      }
      await runStream(res, (data) => {
        const d = data as { sessionId: string; results: { imageId: string; url: string }[]; remaining: string[]; total: number };
        setRemaining(d.remaining ?? []);
        setTotalDiscovered(d.total ?? 0);
        setCapturedCount(d.results.length);
        onConversionComplete(d.sessionId, d.results.map((r) => ({ imageId: r.imageId, label: r.url })));
      });
    } catch (err) {
      addLine({ message: err instanceof Error ? err.message : 'Conversion failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleGetNext() {
    if (!sessionId || remaining.length === 0) return;
    const batch = remaining.slice(0, PAGE_SIZE);
    const nextRemaining = remaining.slice(PAGE_SIZE);
    setLoading(true);
    reset();
    try {
      const res = await fetch('/api/convert/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: batch, sessionId, offset: capturedCount, total: totalDiscovered, viewport, fullPage, format }),
      });
      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try { const d = (await res.json()) as { error?: string }; if (d.error) message = d.error; } catch {}
        addLine({ message, status: 'error' });
        return;
      }
      await runStream(res, (data) => {
        const d = data as { sessionId: string; results: { imageId: string; url: string }[]; total: number };
        setRemaining(nextRemaining);
        setCapturedCount((prev) => prev + d.results.length);
        onConversionComplete(d.sessionId, d.results.map((r) => ({ imageId: r.imageId, label: r.url })));
      });
    } catch (err) {
      addLine({ message: err instanceof Error ? err.message : 'Conversion failed', status: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const nextBatchSize = Math.min(PAGE_SIZE, remaining.length);

  return (
    <form className="converter-input" onSubmit={handleSubmit}>
      <div>
        <label className="converter-input__label" htmlFor="url-input">
          Website URL
        </label>
        <div className="converter-input__row">
          <input
            id="url-input"
            type="url"
            className="converter-input__text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <div>
            <label className="converter-input__label" htmlFor="depth-select">Depth</label>
            <select
              id="depth-select"
              className="converter-input__select"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            >
              <option value={1}>1 — Root only + links</option>
              <option value={2}>2 — Follow links once</option>
            </select>
          </div>
        </div>
        <p className="converter-input__label" style={{ marginTop: 8 }}>
          Screenshots the URL and same-origin linked pages, 10 at a time.
        </p>
      </div>

      <div ref={terminalRef}>
        <Terminal lines={lines} running={loading} />
      </div>

      <div className="converter-input__actions">
        <button type="submit" className="btn btn--primary" disabled={loading || !url.trim()}>
          {loading ? <><span className="spinner" /> Crawling &amp; converting…</> : 'Convert URL'}
        </button>
        {remaining.length > 0 && !loading && (
          <button type="button" className="btn btn--ghost" onClick={handleGetNext}>
            Get next {nextBatchSize} page{nextBatchSize !== 1 ? 's' : ''}
            <span className="converter-input__remaining-badge">{remaining.length} remaining</span>
          </button>
        )}
      </div>
    </form>
  );
}
