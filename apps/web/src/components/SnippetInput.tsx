'use client';

import { useState } from 'react';
import type { GalleryImage } from './ConverterTabs';

interface Props {
  sessionId: string | null;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

const PLACEHOLDER = `<h1 style="font-family: sans-serif; color: #7c6af7;">Hello, Openkova!</h1>
<p style="font-family: sans-serif; color: #666;">Paste any HTML here to convert it to an image.</p>`;

export default function SnippetInput({ sessionId, onConversionComplete }: Props) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = html.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/convert/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: trimmed, sessionId }),
      });

      if (!res.ok) {
        let message = `Server error ${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {}
        throw new Error(message);
      }

      const data = (await res.json()) as { sessionId: string; imageId: string };
      onConversionComplete(data.sessionId, [{ imageId: data.imageId, label: 'snippet' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
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

      {error && <div className="converter-input__error">{error}</div>}

      <div className="converter-input__actions">
        <button type="submit" className="btn btn--primary" disabled={loading || !html.trim()}>
          {loading ? (
            <>
              <span className="spinner" /> Converting…
            </>
          ) : (
            'Convert to Image'
          )}
        </button>
      </div>
    </form>
  );
}
