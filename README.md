# Openkova

[![npm](https://img.shields.io/npm/v/@openkova/core)](https://www.npmjs.com/package/@openkova/core)
[![license](https://img.shields.io/github/license/scnix-git/Openkova)](LICENSE)

Convert HTML to images. Paste a snippet, upload files, or point it at a URL — Openkova renders each page in a headless Chromium browser and returns a PNG, JPEG, WebP, or PDF file.

## Use as a library

```bash
npm install @openkova/core
# or
pnpm add @openkova/core
# or
bun add @openkova/core
```

```js
import { screenshotSnippet, createSession } from '@openkova/core';

const sessionId = createSession();
const imageId = await screenshotSnippet('<h1>Hello</h1>', sessionId, {
  viewport: { width: 1280, height: 800 },
  fullPage: true,
  format: 'png', // 'png' | 'jpeg' | 'webp' | 'pdf'
});
```

See [`packages/core/README.md`](packages/core/README.md) for the full API reference.

## Use as a CLI

```bash
npx @openkova/cli screenshot https://example.com
npx @openkova/cli snippet --html '<h1>Hello</h1>' --format pdf
npx @openkova/cli crawl https://example.com --depth 2 --out ./screenshots/
```

See [`packages/cli/README.md`](packages/cli/README.md) for all commands and flags.

## Use with AI agents (MCP)

Connect any MCP-compatible AI client (Claude Desktop, Cursor, Windsurf) to take screenshots locally:

```json
{
  "mcpServers": {
    "kova": {
      "command": "npx",
      "args": ["@openkova/mcp"]
    }
  }
}
```

See [`packages/mcp/README.md`](packages/mcp/README.md) for setup and tool reference.

## Features

- **HTML Snippet** — paste raw HTML and screenshot it at any viewport size
- **File upload** — upload one or more `.html` files, each rendered separately
- **URL crawl** — screenshot a live site and same-origin linked pages, 10 at a time (up to 200 pages per crawl)
- **Output formats** — PNG, JPEG, WebP, or PDF
- **Full-page capture** — capture the full scrollable height, not just the viewport
- **Viewport selection** — Mobile (390px), Desktop (1280px), or Wide (1920px)
- **Live terminal** — real-time SSE progress stream as the browser captures pages
- **REST API** — all conversions available as SSE-streaming HTTP endpoints
- **Download All** — ZIP download of all files in a session

## Stack

- [Next.js](https://nextjs.org) (App Router, standalone output)
- [Puppeteer Core](https://pptr.dev) + system Chromium
- [pnpm workspaces](https://pnpm.io/workspaces) monorepo — `packages/core`, `packages/cli`, `packages/mcp`, `apps/web`
- Deployed on [Railway](https://railway.app) via Docker

## Self-hosting

### Prerequisites

- Node.js 18+
- pnpm 10+
- Google Chrome or Chromium installed locally

```bash
npm install -g pnpm
```

### Install & run

```bash
pnpm install
pnpm dev
```

The app starts at [http://localhost:3000](http://localhost:3000).

By default the dev server uses the Chromium bundled with the `puppeteer` dev dependency. To use a specific binary set `CHROMIUM_PATH`:

```bash
CHROMIUM_PATH=/usr/bin/chromium pnpm dev
```

Screenshots are saved to `./data` by default. Override with `OPENKOVA_STORAGE_PATH`.

### Docker

```bash
docker compose up --build
```

This builds the multi-stage image (Node + system Chromium on Debian) and mounts a persistent volume at `/data` for screenshots.

## API

All convert endpoints stream [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) rather than a single JSON response. Progress messages arrive as `progress` events; the final result arrives as a `done` event.

```
POST /api/convert/snippet        { html, sessionId?, viewport?, fullPage?, format? }
POST /api/convert/file           multipart/form-data  files[], sessionId?, viewport?, fullPage?, format?
POST /api/convert/url            { url, depth?, sessionId?, viewport?, fullPage?, format? }  — crawl mode
POST /api/convert/url            { urls[], sessionId, offset, total, viewport?, fullPage?, format? }  — paginate mode
GET  /api/image/:sid/:id         → file binary (PNG/JPEG/WebP/PDF)
GET  /api/session/:sid/download  → ZIP of all session files
GET  /api/session/:sid           → { images: string[] }
```

`format` accepts `"png"` (default), `"jpeg"`, `"webp"`, or `"pdf"`. The returned `imageId` includes the file extension (e.g. `abc123.jpg`).

Full documentation is available at `/docs` in the running app.

### Quick example

```js
const res = await fetch('/api/convert/snippet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html: '<h1>Hello</h1>',
    viewport: { width: 1280, height: 800 },
    fullPage: true,
    format: 'pdf',
  }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  for (const part of buffer.split('\n\n').slice(0, -1)) {
    const line = part.split('\n').find(l => l.startsWith('data: '));
    if (!line) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === 'done') console.log(event.data); // { sessionId, imageId, url }
  }
  buffer = buffer.split('\n\n').pop() ?? '';
}
```

## Project structure

```
apps/
  web/          Next.js app (UI + API routes)
packages/
  core/         Headless renderer, crawler, storage adapter
  cli/          Command-line interface (npx @openkova/cli)
  mcp/          Local MCP server for AI clients (npx @openkova/mcp)
Dockerfile      Multi-stage build for Railway/Docker
railway.toml    Railway deployment config
```

## Storage retention

Files are automatically deleted **24 hours** after the session directory was last written to. A cleanup pass runs every hour on server startup via `instrumentation.ts`. Download your files before then using the **Download All** button or the `/api/session/:sid/download` ZIP endpoint.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CHROMIUM_PATH` | auto-detected | Path to Chrome/Chromium binary |
| `OPENKOVA_STORAGE_PATH` | `./data` | Directory for saved files |
| `PORT` | `3000` | HTTP port |

## License

MIT
