'use client';

import { useState } from 'react';
import type { GalleryImage } from './ConverterTabs';
import Terminal, { type LogLine } from './Terminal';
import { parseSSEStream } from '@/lib/sse';

interface Props {
  sessionId: string | null;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

export default function UrlInput({ sessionId, onConversionComplete }: Props) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);

  function addLine(line: LogLine) {
    setLines((prev) => [...prev, line]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setLines([]);

    try {
      const res = await fetch('/api/convert/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, sessionId, depth }),
      });

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
          const data = event.data as { sessionId: string; results: { imageId: string; url: string }[] };
          const images: GalleryImage[] = data.results.map((r) => ({
            imageId: r.imageId,
            label: r.url,
          }));
          onConversionComplete(data.sessionId, images);
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
          Screenshots the URL and all same-origin linked pages.
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
      </div>
    </form>
  );
}
