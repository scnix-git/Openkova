# Changelog

## v0.2.0 — Security hardening & robustness

### Security

- **SSRF: IPv6-mapped IPv4** — `PRIVATE_IP_RE` now blocks `::ffff:` mapped addresses (e.g. `::ffff:192.168.1.1`) that previously bypassed the hostname check
- **Crawl URL cap** — `crawlUrl` now returns at most `MAX_CRAWL_URLS` (200) URLs, preventing unbounded memory usage and timing-based DoS at depth=2
- **Direct-mode protocol validation** — the `/api/convert/url` direct (`urls[]`) mode now validates `http`/`https` before checking SSRF, returning the correct 400 message per violation type
- **Explicit public API** — `packages/core/src/index.ts` switched from `export *` to explicit named exports; `MAX_CRAWL_URLS` is now part of the public API

### Robustness

- **Session list endpoint** — `GET /api/session/[sessionId]` now catches invalid session IDs and returns 400 instead of 500
- **Partial ZIP downloads** — `GET /api/session/[sessionId]/download` wraps each `storage.get()` call individually; unreadable files are listed in an `ERRORS.txt` inside the ZIP rather than aborting the whole download
- **Image route error body** — `GET /api/image/[sessionId]/[id]` now returns a JSON error body on 400 instead of an empty response

### Developer experience

- **Shared `config.ts`** — `PAGE_SIZE`, `MAX_HTML_BYTES`, `MAX_FILES`, `MAX_FILE_SIZE` are now defined once in `apps/web/src/lib/config.ts`
- **`resolveSessionId` utility** — extracted from all three convert routes into `apps/web/src/lib/parse.ts`
- **`parseViewport` moved** — `Viewport` and `parseViewport` now live natively in `parse.ts` (imported from `@openkova/core`); removed from `sse.ts`
- **Depth=2 progress messages** — replaced per-link "Fetching X" noise with a single "Following N links…" milestone

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
