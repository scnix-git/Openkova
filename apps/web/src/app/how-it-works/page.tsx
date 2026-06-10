import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How it works — Openkova' };

export default function HowItWorksPage() {
  return (
    <main className="page">
      <h1 className="page__title">How it works</h1>
      <p className="page__subtitle">
        The pipeline from HTML input to screenshot output, step by step.
      </p>

      <div className="prose">
        <h2>Interfaces</h2>
        <p>Openkova exposes four ways to reach the same rendering engine:</p>
        <ul>
          <li>
            <strong>Web UI</strong> — paste a snippet, upload files, or enter a URL in the browser.
          </li>
          <li>
            <strong>REST API</strong> — SSE-streaming HTTP endpoints, documented on the{' '}
            <a href="/docs">Docs</a> page.
          </li>
          <li>
            <strong>CLI</strong> — <code>npx @openkova/cli</code> for terminal and CI/CD use.
          </li>
          <li>
            <strong>MCP</strong> — <code>npx @openkova/mcp</code> for AI clients (Claude Desktop,
            Cursor, Windsurf).
          </li>
        </ul>
        <p>
          The web UI and REST API run through the Next.js app. The CLI and MCP server use{' '}
          <code>@openkova/core</code> directly and require a local Chromium binary.
        </p>

        <h2>Web UI / API pipeline</h2>
        <div className="pipeline">
          {[
            'HTML input',
            'Next.js API route',
            'Puppeteer / Chromium',
            'Screenshot / PDF',
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
          A long-lived headless Chromium instance loads the HTML — either via{' '}
          <code>page.setContent()</code> for snippets/files or <code>page.goto()</code> for URLs.
          The viewport defaults to 1280×800 and is configurable. Output format can be PNG, JPEG,
          WebP, or PDF.
        </p>

        <h2>4. Storage</h2>
        <p>
          The output buffer is saved by <code>LocalStorageAdapter</code> under{' '}
          <code>OPENKOVA_STORAGE_PATH/&lt;sessionId&gt;/&lt;imageId&gt;</code>. The{' '}
          <code>StorageAdapter</code> interface makes it straightforward to swap in S3-compatible
          or any other storage backend.
        </p>

        <h2>5. Response</h2>
        <p>
          The API streams SSE progress events and closes with a <code>done</code> event containing{' '}
          <code>sessionId</code>, <code>imageId</code>, and a <code>url</code> pointing to{' '}
          <code>/api/image/…</code> where the file is served with proper caching headers.
        </p>

        <h2>URL crawling</h2>
        <p>
          When you submit a URL, Openkova fetches the page, extracts all same-origin{' '}
          <code>&lt;a href&gt;</code> links, deduplicates them, and screenshots each one. Depth 1
          captures the root page and its direct links; depth 2 follows those links one level
          further. Results are capped at 200 pages per crawl.
        </p>

        <h2>CLI pipeline</h2>
        <p>
          <code>@openkova/cli</code> imports <code>@openkova/core</code> directly — no web server
          involved. It passes a <code>CliStorageAdapter</code> that writes files straight to the{' '}
          <code>--out</code> directory with human-readable filenames derived from the URL or{' '}
          <code>--name</code> flag.
        </p>

        <h2>MCP pipeline</h2>
        <p>
          <code>@openkova/mcp</code> runs as a local stdio MCP server. Your AI client launches it
          as a subprocess and communicates via JSON-RPC. Each tool call renders a screenshot using
          local Chromium, saves the file to disk, and returns the image as a base64 content block
          so the AI can see the result inline.
        </p>
      </div>
    </main>
  );
}
