import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How it works — Openkova' };

export default function HowItWorksPage() {
  return (
    <main className="page">
      <h1 className="page__title">How it works</h1>
      <p className="page__subtitle">
        The pipeline from HTML input to PNG output, step by step.
      </p>

      <div className="prose">
        <h2>The pipeline</h2>
        <div className="pipeline">
          {[
            'HTML input',
            'Next.js API route',
            'Puppeteer / Chromium',
            'PNG screenshot',
            'LocalStorageAdapter',
            'Served as /api/image/…',
          ].reduce<React.ReactNode[]>((acc, step, i, arr) => {
            acc.push(
              <div key={step} className="pipeline__step">
                <div className="pipeline__box">{step}</div>
                {i < arr.length - 1 && <div className="pipeline__arrow">→</div>}
              </div>,
            );
            return acc;
          }, [])}
        </div>

        <h2>1. Input</h2>
        <p>
          You provide HTML via the web UI or REST API — as a snippet, an uploaded{' '}
          <code>.html</code> file, or a URL to crawl.
        </p>

        <h2>2. API route</h2>
        <p>
          A Next.js App Router API route receives your input, resolves or creates a session ID,
          and calls <code>@openkova/core</code>.
        </p>

        <h2>3. Puppeteer render</h2>
        <p>
          A long-lived headless Chromium instance (1280×800 viewport) loads the HTML — either via{' '}
          <code>page.setContent()</code> for snippets/files or <code>page.goto()</code> for URLs.
          It waits for <code>networkidle0</code> before capturing.
        </p>

        <h2>4. Storage</h2>
        <p>
          The PNG buffer is saved by <code>LocalStorageAdapter</code> under{' '}
          <code>OPENKOVA_STORAGE_PATH/&lt;sessionId&gt;/&lt;imageId&gt;.png</code>. The{' '}
          <code>StorageAdapter</code> interface makes it straightforward to swap in S3-compatible
          storage in Phase 2.
        </p>

        <h2>5. Response</h2>
        <p>
          The API returns a JSON object with <code>sessionId</code>, <code>imageId</code>, and a{' '}
          <code>url</code> pointing to <code>/api/image/…</code> where the PNG is served with
          proper caching headers.
        </p>

        <h2>URL crawling</h2>
        <p>
          When you submit a URL, Openkova fetches the page, extracts all same-origin{' '}
          <code>&lt;a href&gt;</code> links, deduplicates them, and screenshots each one (up to
          10 pages). The crawl depth controls whether linked pages are also followed.
        </p>
      </div>
    </main>
  );
}
