'use client';

import { useState } from 'react';
import type { GalleryImage } from './ConverterTabs';
import Terminal, { type LogLine } from './Terminal';
import { parseSSEStream } from '@/lib/sse';

interface Props {
  sessionId: string | null;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

const PAGE_SIZE = 10;

export default function UrlInput({ sessionId, onConversionComplete }: Props) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [totalDiscovered, setTotalDiscovered] = useState(0);
  const [capturedCount, setCapturedCount] = useState(0);

  function addLine(line: LogLine) {
    setLines((prev) => [...prev, line]);
  }

  async function runStream(
    res: Response,
    onDone: (data: Record<string, unknown>) => void,
  ): Promise<void> {
    if (!res.body) throw new Error('No response body');
    let gotDone = false;
    for await (const event of parseSSEStream(res.body)) {
      if (event.type === 'progress') {
        addLine({ message: event.message, status: 'progress' });
      } else if (event.type === 'done') {
        gotDone = true;
        addLine({ message: event.message, status: 'done' });
        onDone(event.data);
      } else if (event.type === 'error') {
        addLine({ message: event.message, status: 'error' });
        return;
      }
    }
    if (!gotDone) addLine({ message: 'Conversion failed unexpectedly', status: 'error' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setLines([]);
    setRemaining([]);
    setTotalDiscovered(0);
    setCapturedCount(0);

    try {
      const res = await fetch('/api/convert/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, sessionId, depth }),
      });

      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {}
        addLine({ message, status: 'error' });
        return;
      }

      await runStream(res, (data) => {
        const d = data as {
          sessionId: string;
          results: { imageId: string; url: string }[];
          remaining: string[];
          total: number;
        };
        setRemaining(d.remaining ?? []);
        setTotalDiscovered(d.total ?? 0);
        setCapturedCount(d.results.length);
        const images: GalleryImage[] = d.results.map((r) => ({ imageId: r.imageId, label: r.url }));
        onConversionComplete(d.sessionId, images);
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
    setLines([]);

    try {
      const res = await fetch('/api/convert/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: batch,
          sessionId,
          offset: capturedCount,
          total: totalDiscovered,
        }),
      });

      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {}
        addLine({ message, status: 'error' });
        return;
      }

      await runStream(res, (data) => {
        const d = data as {
          sessionId: string;
          results: { imageId: string; url: string }[];
          total: number;
        };
        setRemaining(nextRemaining);
        setCapturedCount(capturedCount + d.results.length);
        const images: GalleryImage[] = d.results.map((r) => ({ imageId: r.imageId, label: r.url }));
        onConversionComplete(d.sessionId, images);
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
            <label className="converter-input__label" htmlFor="depth-select">
              Depth
            </label>
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

      <Terminal lines={lines} running={loading} />

      <div className="converter-input__actions">
        <button type="submit" className="btn btn--primary" disabled={loading || !url.trim()}>
          {loading ? (
            <>
              <span className="spinner" /> Crawling &amp; converting…
            </>
          ) : (
            'Convert URL'
          )}
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
