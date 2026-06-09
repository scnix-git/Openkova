# Changelog

## v0.2.1 — IPv6 SSRF patch

### Security

- **Critical fix: IPv6 SSRF bypass** — `isSafeHost` now correctly blocks all IPv6 private addresses. `URL.hostname` wraps IPv6 in brackets (`[::1]`) and normalises `::ffff:` mapped addresses to hex-group notation (`::ffff:c0a8:101`); the previous regex never matched either form, so `::1`, `fe80::`, `fc00::`, and all `::ffff:`-mapped private IPv4 addresses passed through unchecked. Fixed by stripping brackets and converting IPv4-mapped hex back to dotted decimal before testing.

### Core package

- Error messages thrown by `@openkova/core` are now prefixed with `@openkova/core:` for easier identification in consumer stack traces
- `screenshotUrl` JSDoc now documents the `@throws` conditions (non-http/https URL, private host)

### Docs

- `crawlUrl`, `MAX_CRAWL_URLS`, and `screenshotUrl` throws are now documented in the npm README
- Changelog linked from npm README to [openkova.dev/changelog](https://www.openkova.dev/changelog)

---

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
