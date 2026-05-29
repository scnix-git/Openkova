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
            in a full document and screenshots at 1280×800.
          </li>
          <li>
            <strong>Files</strong> — Upload one or more <code>.html</code> files. Each is processed
            and returned as a separate screenshot.
          </li>
          <li>
            <strong>URL / Crawl</strong> — Provide a URL. Openkova screenshots the root page and
            up to 10 same-origin linked pages (depth 1 or 2).
          </li>
        </ul>

        <h2>Sessions</h2>
        <p>
          Each browser session is identified by a UUID stored in the{' '}
          <code>openkova_session</code> cookie. All screenshots produced in a session are grouped
          together and accessible for the duration of your visit.
        </p>

        <h2>REST API</h2>
        <p>All endpoints accept and return JSON unless noted.</p>

        <h2>POST /api/convert/snippet</h2>
        <pre>
          <code>{`{ "html": "<h1>Hello</h1>", "sessionId": "optional-uuid" }`}</code>
        </pre>
        <p>
          Returns <code>{`{ sessionId, imageId, url }`}</code>.
        </p>

        <h2>POST /api/convert/file</h2>
        <p>
          Multipart form data. Field <code>files</code> (multiple). Optional field{' '}
          <code>sessionId</code>.
        </p>
        <p>
          Returns <code>{`{ sessionId, results: [{ imageId, filename, url }] }`}</code>.
        </p>

        <h2>POST /api/convert/url</h2>
        <pre>
          <code>{`{ "url": "https://example.com", "depth": 1, "sessionId": "optional-uuid" }`}</code>
        </pre>
        <p>
          Returns <code>{`{ sessionId, results: [{ imageId, url }] }`}</code>.
        </p>

        <h2>GET /api/session/:sessionId</h2>
        <p>
          Returns <code>{`{ images: string[] }`}</code> — list of image IDs for the session.
        </p>

        <h2>GET /api/image/:sessionId/:id</h2>
        <p>Returns the PNG binary directly. Use as an image src.</p>
      </div>
    </main>
  );
}
