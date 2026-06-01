import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Docs — Openkova' };

export default function DocsPage() {
  return (
    <main className="page">
      <h1 className="page__title">Documentation</h1>
      <p className="page__subtitle">Everything you need to use Openkova.</p>

      <div className="prose">
        <h2>Conversion modes</h2>
        <p>Openkova supports three ways to produce screenshots:</p>
        <ul>
          <li>
            <strong>HTML Snippet</strong> — Paste raw HTML into the textarea. The server wraps it
            in a full document, renders it in a headless Chromium browser at 1280×800, and returns
            a PNG screenshot.
          </li>
          <li>
            <strong>Files</strong> — Upload one or more <code>.html</code> or <code>.htm</code>{' '}
            files. Each file is rendered individually and returned as a separate screenshot,
            processed in order.
          </li>
          <li>
            <strong>URL / Crawl</strong> — Provide any public URL. Openkova fetches the page,
            extracts all same-origin links, and screenshots up to 10 pages (depth 1 follows direct
            links; depth 2 follows their links once more). Pages are captured sequentially.
          </li>
        </ul>

        <h2>Sessions</h2>
        <p>
          Every conversion is associated with a session — a UUID that groups your screenshots
          together. The session ID is returned in every API response and stored in an{' '}
          <code>openkova_session</code> HTTP-only cookie (7-day expiry). Pass it back as{' '}
          <code>sessionId</code> in subsequent requests to keep results in the same gallery. If you
          omit it, a new session is created automatically.
        </p>
        <p>
          <strong>Storage retention: 24 hours.</strong> Screenshots are automatically deleted 24
          hours after the session was last written to. The server runs a cleanup pass every hour.
          Download your images before then — use the <strong>Download All</strong> button or the{' '}
          <code>GET /api/session/:sessionId/download</code> endpoint to grab everything as a ZIP.
        </p>

        <h2>Streaming responses (SSE)</h2>
        <p>
          All three convert endpoints respond with a{' '}
          <strong>Server-Sent Events (SSE) stream</strong> rather than a single JSON blob. This
          lets the UI (and your own code) display live progress as the browser launches, pages load,
          and snapshots are taken.
        </p>
        <p>Each line in the stream is a JSON event in one of three shapes:</p>
        <pre>
          <code>{`// A step in progress
{ "type": "progress", "message": "Launching virtual browser" }

// Final success — stream closes after this
{ "type": "done", "message": "Done — 3 screenshots saved", "data": { ... } }

// Unrecoverable error — stream closes after this
{ "type": "error", "message": "Conversion failed" }`}</code>
        </pre>
        <p>
          The <code>data</code> field on <code>done</code> events contains the same payload that
          was previously returned as JSON (see per-endpoint details below).
        </p>
        <p>
          The <code>Set-Cookie</code> header for the session is set on the streaming response
          itself, so cookies work normally even though there is no JSON body.
        </p>

        <h2>Consuming the stream (JavaScript)</h2>
        <pre>
          <code>{`const res = await fetch('/api/convert/snippet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ html: '<h1>Hello</h1>' }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // SSE events are separated by double newline
  const parts = buffer.split('\\n\\n');
  buffer = parts.pop() ?? '';

  for (const part of parts) {
    const line = part.split('\\n').find(l => l.startsWith('data: '));
    if (!line) continue;
    const event = JSON.parse(line.slice(6));

    if (event.type === 'progress') console.log(event.message);
    if (event.type === 'done')     console.log('Result:', event.data);
    if (event.type === 'error')    console.error(event.message);
  }
}`}</code>
        </pre>

        <h2>POST /api/convert/snippet</h2>
        <p>
          Renders a raw HTML string and returns a single screenshot. The HTML is wrapped in a
          minimal full document with a reset stylesheet before rendering.
        </p>
        <p>
          <strong>Request</strong> — <code>Content-Type: application/json</code>
        </p>
        <pre>
          <code>{`{
  "html":      "<h1>Hello</h1>",   // required — raw HTML string
  "sessionId": "uuid"              // optional — omit to create a new session
}`}</code>
        </pre>
        <p>
          <strong>SSE progress messages:</strong> Launching virtual browser → Rendering HTML →
          Taking snapshot
        </p>
        <p>
          <strong>Done event data:</strong>
        </p>
        <pre>
          <code>{`{
  "sessionId": "uuid",
  "imageId":   "uuid",
  "url":       "/api/image/{sessionId}/{imageId}"
}`}</code>
        </pre>

        <h2>POST /api/convert/file</h2>
        <p>
          Accepts one or more HTML files as multipart form data and returns one screenshot per
          file. Files are rendered sequentially in the order they are submitted.
        </p>
        <p>
          <strong>Request</strong> — <code>Content-Type: multipart/form-data</code>
        </p>
        <pre>
          <code>{`files     File[]   // required — one or more .html/.htm files
sessionId string   // optional form field`}</code>
        </pre>
        <p>
          <strong>SSE progress messages:</strong> Launching virtual browser → Rendering{' '}
          <em>filename.html</em> (repeated per file)
        </p>
        <p>
          <strong>Done event data:</strong>
        </p>
        <pre>
          <code>{`{
  "sessionId": "uuid",
  "results": [
    { "imageId": "uuid", "filename": "index.html", "url": "/api/image/..." },
    ...
  ]
}`}</code>
        </pre>

        <h2>POST /api/convert/url</h2>
        <p>
          Crawls a public URL and screenshots discovered pages 10 at a time. The crawler fetches
          the root page, extracts same-origin <code>&lt;a href&gt;</code> links (ignoring
          fragments, external domains, and duplicates), then screenshots the first 10. The{' '}
          <code>remaining</code> field in the done event contains any URLs not yet captured — pass
          them back via the <code>urls</code> field to fetch the next batch without re-crawling.
        </p>
        <p>
          <strong>Request (crawl mode)</strong> — <code>Content-Type: application/json</code>
        </p>
        <pre>
          <code>{`{
  "url":       "https://example.com",  // required — valid absolute URL
  "depth":     1,                      // optional — 1 (default) or 2
  "sessionId": "uuid"                  // optional
}`}</code>
        </pre>
        <p>
          <strong>Request (paginate mode)</strong> — pass pre-known URLs to screenshot without
          re-crawling:
        </p>
        <pre>
          <code>{`{
  "urls":      ["https://example.com/page-11", ...],  // required
  "sessionId": "uuid",   // required — use the session from the first request
  "offset":    10,       // how many pages were already captured
  "total":     25        // total discovered in the original crawl
}`}</code>
        </pre>
        <p>
          <strong>SSE progress messages:</strong> Fetching <em>url</em> → Found N pages to capture
          → Launching virtual browser → Capturing page X/N: <em>url</em> (repeated per page)
        </p>
        <p>
          <strong>Done event data:</strong>
        </p>
        <pre>
          <code>{`{
  "sessionId": "uuid",
  "results":   [{ "imageId": "uuid", "url": "https://example.com/" }, ...],
  "remaining": ["https://example.com/page-11", ...],  // empty array when all captured
  "total":     25
}`}</code>
        </pre>

        <h2>GET /api/image/:sessionId/:id</h2>
        <p>
          Returns a single PNG screenshot with <code>Content-Type: image/png</code>. Use directly
          as an <code>&lt;img src&gt;</code> or download link. Responses are cached for 1 hour (
          <code>Cache-Control: public, max-age=3600, immutable</code>).
        </p>
        <p>
          Returns <code>404</code> if the image does not exist.
        </p>

        <h2>GET /api/session/:sessionId/download</h2>
        <p>
          Downloads all screenshots in a session as a single <code>.zip</code> file (
          <code>Content-Type: application/zip</code>). Each image is stored uncompressed inside
          the archive (compression level 0) since PNGs are already compressed. Returns{' '}
          <code>404</code> if the session has no images.
        </p>
        <p>
          This is the endpoint behind the <strong>Download All</strong> button in the UI — it is a
          plain link, no JavaScript required.
        </p>

        <h2>GET /api/session/:sessionId</h2>
        <p>Returns all image IDs associated with a session.</p>
        <pre>
          <code>{`{ "images": ["uuid1", "uuid2", ...] }`}</code>
        </pre>
        <p>Returns an empty array if the session has no images or does not exist.</p>
      </div>
    </main>
  );
}
