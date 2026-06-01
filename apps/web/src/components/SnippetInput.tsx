'use client';

import { useEffect, useRef, useState } from 'react';
import type { GalleryImage } from './ConverterTabs';
import Terminal, { type LogLine } from './Terminal';
import { parseSSEStream } from '@/lib/sse';

interface Props {
  sessionId: string | null;
  onConversionComplete: (sessionId: string, images: GalleryImage[]) => void;
}

const PLACEHOLDER = `<h1 style="font-family: sans-serif; color: #7c6af7;">Hello, Openkova!</h1>
<p style="font-family: sans-serif; color: #666;">Paste any HTML here to convert it to an image.</p>`;

export default function SnippetInput({ sessionId, onConversionComplete }: Props) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && lines.length > 0) {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading]);

  function addLine(line: LogLine) {
    setLines((prev) => [...prev, line]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = html.trim();
    if (!trimmed) return;

    setLoading(true);
    setLines([]);

    try {
      const res = await fetch('/api/convert/snippet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: trimmed, sessionId }),
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
          const data = event.data as { sessionId: string; imageId: string };
          onConversionComplete(data.sessionId, [{ imageId: data.imageId, label: 'snippet' }]);
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
