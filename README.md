# Openkova

Convert HTML to images. Paste a snippet, upload files, or point it at a URL — Openkova renders each page in a headless Chromium browser and returns a PNG screenshot.

## Features

- **HTML Snippet** — paste raw HTML, get a screenshot at 1280×800
- **File upload** — upload one or more `.html` files, each rendered separately
- **URL crawl** — screenshot a live site and up to 10 same-origin linked pages
- **Live terminal** — real-time progress stream as the browser launches and captures pages
- **REST API** — all conversions available as SSE-streaming HTTP endpoints

## Stack

- [Next.js 16](https://nextjs.org) (App Router, standalone output)
- [Puppeteer Core](https://pptr.dev) + system Chromium
- [pnpm workspaces](https://pnpm.io/workspaces) monorepo — `packages/core` + `apps/web`
- Deployed on [Railway](https://railway.app) via Docker

## Getting started

### Prerequisites

- Node.js 24
- pnpm 10+
- Google Chrome or Chromium installed locally

```bash
corepack enable
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

This builds the multi-stage image (Node 24 + system Chromium on Debian) and mounts a persistent volume at `/data` for screenshots.

## API

All convert endpoints stream [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) rather than a single JSON response. Progress messages arrive as `progress` events; the final result arrives as a `done` event.

```
POST /api/convert/snippet   { html, sessionId? }
POST /api/convert/file      multipart/form-data  files[], sessionId?
POST /api/convert/url       { url, depth?, sessionId? }
GET  /api/image/:sid/:id    → PNG binary
GET  /api/session/:sid      → { images: string[] }
```

Full documentation is available at `/docs` in the running app.

### Quick example

```js
const res = await fetch('/api/convert/snippet', {
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
Dockerfile      Multi-stage build for Railway/Docker
railway.toml    Railway deployment config
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CHROMIUM_PATH` | auto-detected | Path to Chrome/Chromium binary |
| `OPENKOVA_STORAGE_PATH` | `./data` | Directory for saved screenshots |
| `PORT` | `3000` | HTTP port |

## License

MIT
