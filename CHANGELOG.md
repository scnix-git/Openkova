# Changelog

## v0.1.1 — Initial npm release

First public release of `@openkova/core` on npm.

### Web app

- **Viewport selection** — capture at Mobile (390px), Desktop (1280px), or Wide (1920px)
- **Full-page capture** — toggle to screenshot the full scrollable height, not just the viewport
- **Paginated URL crawl** — screenshot 10 pages at a time with a "Get next" button for large sites
- **Download All** — ZIP download of all screenshots in a session
- **Live terminal** — real-time SSE progress stream during conversion
- **Gallery preview** — full screenshot visible in preview tiles

### Core package (`@openkova/core`)

- Published to npm — `npm install @openkova/core` / `pnpm add @openkova/core` / `bun add @openkova/core`
- Removed `uuid` dependency in favour of built-in `crypto.randomUUID()`
- Supports `viewport`, `fullPage`, and `onProgress` options on all screenshot functions
- Pluggable `StorageAdapter` interface for custom storage backends
- 24-hour automatic session cleanup

### Infrastructure

- Docker + Railway deployment with system Chromium
- Multi-stage Dockerfile (builder → slim runner, no pnpm at runtime)
