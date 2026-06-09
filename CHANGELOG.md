# Changelog

Release history for Openkova and `@openkova/core`.

---

## v0.2.1 — 9 Jun 2026

IPv6 SSRF patch

### Security

- **IPv6 SSRF bypass fix** — `isSafeHost` now correctly blocks all IPv6 private addresses. `URL.hostname` wraps IPv6 in brackets (`[::1]`) and normalises `::ffff:` mapped addresses to hex-group notation (`::ffff:c0a8:101`); the previous regex never matched either form, so `::1`, `fe80::`, `fc00::`, and all `::ffff:`-mapped private IPv4 addresses passed through unchecked. Fixed by stripping brackets and converting IPv4-mapped hex back to dotted decimal before testing.

### Core library (`@openkova/core`)

- Error messages are now prefixed with `@openkova/core:` for easier identification in consumer stack traces.
- `screenshotUrl` JSDoc now documents the `@throws` conditions (non-http/https URL, private host).
- `crawlUrl`, `MAX_CRAWL_URLS`, and `screenshotUrl` throws are now documented in the npm README.
- Changelog linked from npm README to [openkova.dev/changelog](https://www.openkova.dev/changelog).

---

## v0.2.0 — 9 Jun 2026

Security hardening & robustness

### Security

- **IPv6 SSRF fix** — private IPv6 addresses (`::1`, `fe80::`, `fc00::`, `::ffff:`-mapped) are now correctly blocked; previously they bypassed the SSRF filter due to how browsers normalise IPv6 hostnames.
- **Crawl URL cap** — `crawlUrl` now returns at most 200 URLs per call (`MAX_CRAWL_URLS`), preventing unbounded crawls from being used as a timing attack.
- **Protocol allowlist** — the direct URL mode now explicitly validates `http`/`https` before checking for private networks, returning the correct error message for each violation type.

### Robustness

- Invalid session IDs in the session list endpoint now return a clean 400 instead of a 500.
- ZIP downloads are now fault-tolerant — if one file fails to read, the rest still download; an `ERRORS.txt` manifest is included listing any skipped files.
- The image endpoint now returns a proper JSON error body on 400.
- Depth-2 crawling is fully implemented — previously only the first level of links was followed; the second pass now correctly discovers and queues sub-links.
- Browser launch hardened: Chrome detection is now async (no event-loop blocking), concurrent launch requests are deduplicated to prevent a race condition, and a clear error is thrown if no Chromium executable is found.

### Developer experience (`@openkova/core`)

- `MAX_CRAWL_URLS` (200) is now an exported constant.
- `screenshotUrl` now throws with a descriptive message for non-http/https URLs and private hosts.
- Switched from `export *` to explicit named exports — the public API surface is now clearly defined.
- Error messages are prefixed with `@openkova/core:` for easier identification in consumer stack traces.

---

## v0.1.2 — Jun 2026

Output format selection

- **PNG, JPEG, WebP, PDF** — choose your output format per conversion; previously only PNG was supported.
- PDF output uses `printBackground: true` and respects the viewport dimensions when full-page capture is off.
- Image IDs now include the file extension (e.g. `abc123.jpg`) so storage is format-aware.
- Gallery shows a PDF placeholder for `.pdf` outputs.

---

## v0.1.1 — 6 Jun 2026

Initial release

### Web app

- **HTML Snippet** — paste any HTML and get a pixel-accurate screenshot.
- **File upload** — upload one or more `.html` files; each is rendered separately.
- **URL crawl** — screenshot a live site and all same-origin linked pages, 10 at a time; continue with "Get next 10 pages" for large sites.
- **Viewport selection** — render at Mobile (390px), Desktop (1280px), or Wide (1920px).
- **Full-page capture** — capture the full scrollable height, not just the visible viewport.
- **Live terminal** — real-time progress stream as the browser captures each page.
- **Gallery preview** — screenshots appear inline as they complete.
- **Download All** — one-click ZIP download of every file in your session.
- **24-hour retention** — files are automatically cleaned up 24 hours after capture.

### Core library (`@openkova/core`)

- `screenshotSnippet` — render an HTML string to an image.
- `screenshotUrl` — navigate to a live URL and capture it.
- `crawlUrl` — discover same-origin links and return the full URL list (depth 1 or 2).
- Configurable viewport, full-page mode, and progress callback on every function.
- `StorageAdapter` interface — plug in your own storage backend (S3, database, etc.).
- Session-based file organisation.
- `OPENKOVA_STORAGE_PATH` and `CHROMIUM_PATH` environment variable support.
- Removed `uuid` dependency in favour of the built-in `crypto.randomUUID()`.
