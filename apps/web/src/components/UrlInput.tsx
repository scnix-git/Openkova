'use client';

import { useState } from 'react';
import type { GalleryImage } from './ConverterTabs';

interface Props {
  sessionId: string | null;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

export default function UrlInput({ sessionId, onConversionComplete }: Props) {
  const [url, setUrl] = useState('');
  const [depth, setDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

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
        throw new Error(message);
      }

      const data = (await res.json()) as {
        sessionId: string;
        results: { imageId: string; url: string }[];
      };

      const images: GalleryImage[] = data.results.map((r) => ({
        imageId: r.imageId,
        label: r.url,
      }));
      onConversionComplete(data.sessionId, images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
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
          Screenshots the URL and up to 10 same-origin linked pages.
        </p>
      </div>

      {error && <div className="converter-input__error">{error}</div>}

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
