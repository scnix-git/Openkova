# @openkova/core

Node.js library for HTML to image and PDF conversion. Powers a self-hosted screenshot API — render snippets, local HTML files, or live URLs to pixel-accurate PNG, JPEG, WebP, or PDF using headless Chromium. Configurable viewport, full-page capture, output format, and pluggable storage.

**Website:** [openkova.dev](https://www.openkova.dev) · [API docs](https://www.openkova.dev/screenshot-api) · [Docs](https://www.openkova.dev/docs) · [Blog](https://www.openkova.dev/blog)

## Install

```bash
npm install @openkova/core
# or
pnpm add @openkova/core
# or
bun add @openkova/core
```

`@openkova/core` uses `puppeteer-core` and expects a Chromium binary to be available. In most environments, install `puppeteer` as a dev dependency (it bundles its own Chrome) or set the `CHROMIUM_PATH` environment variable to point to a system-installed binary.

```bash
npm install -D puppeteer
```

## Usage

### Screenshot an HTML snippet

```js
import { screenshotSnippet, createSession } from '@openkova/core';

const sessionId = createSession();
const imageId = await screenshotSnippet('<h1>Hello</h1>', sessionId, {
  viewport: { width: 1280, height: 800 },
  fullPage: false,
  format: 'png', // 'png' | 'jpeg' | 'webp' | 'pdf'
  onProgress: (msg) => console.log(msg),
});
// file saved to ./data/<sessionId>/<imageId>  (e.g. abc123.png)
```

### Screenshot a URL

```js
import { screenshotUrl, createSession } from '@openkova/core';

const sessionId = createSession();
const imageId = await screenshotUrl('https://example.com', sessionId, {
  viewport: { width: 1280, height: 800 },
  fullPage: true,
  format: 'webp',
});
```

### Generate a PDF

```js
import { screenshotSnippet, createSession } from '@openkova/core';

const sessionId = createSession();
const imageId = await screenshotSnippet(html, sessionId, {
  format: 'pdf',
});
// imageId will be something like abc123.pdf
```

### Crawl a site and screenshot all pages

```js
import { crawlUrl, screenshotUrl, createSession } from '@openkova/core';

const sessionId = createSession();
const urls = await crawlUrl('https://example.com', 1); // depth 1 = root + linked pages
for (const url of urls) {
  await screenshotUrl(url, sessionId, { format: 'jpeg' });
}
```

### Custom storage

By default files are saved to `./data` (overridable via `OPENKOVA_STORAGE_PATH`). Pass a custom `StorageAdapter` for full control:

```js
import { createRenderer, LocalStorageAdapter } from '@openkova/core';

const storage = new LocalStorageAdapter('/tmp/screenshots');
const { screenshotSnippet, screenshotUrl } = createRenderer(storage);
```

The `StorageAdapter` interface lets you save to S3, a database, or anywhere else:

```ts
interface StorageAdapter {
  save(sessionId: string, imageId: string, data: Buffer): Promise<void>;
  get(sessionId: string, imageId: string): Promise<Buffer | null>;
  list(sessionId: string): Promise<string[]>;
  delete(sessionId: string, imageId: string): Promise<void>;
}
```

Note: `imageId` values include the file extension (e.g. `"abc123.jpg"`), so your adapter receives the full filename as the key.

## API

### `screenshotSnippet(html, sessionId, options?)`

Wraps the HTML string in a full document (with meta viewport) and renders it.

| Option | Type | Default | Description |
|---|---|---|---|
| `viewport` | `{ width, height }` | `1280×800` | Browser viewport size |
| `fullPage` | `boolean` | `false` | Capture full scrollable height |
| `format` | `'png' \| 'jpeg' \| 'webp' \| 'pdf'` | `'png'` | Output file format |
| `onProgress` | `(msg: string) => void` | — | Progress callback |

Returns the `imageId` string (includes extension, e.g. `"abc123.jpg"`).

### `screenshotUrl(url, sessionId, options?)`

Navigates to a live URL and renders it. Accepts the same options as `screenshotSnippet`.

Throws if `url` does not use `http`/`https` or if the host resolves to a private/loopback address (SSRF protection).

### `crawlUrl(rootUrl, depth?, onProgress?)`

Fetches `rootUrl`, extracts same-origin `<a href>` links, and returns the full list of URLs to capture. `depth` can be `1` (root + its links) or `2` (follow links one level further). Results are capped at `MAX_CRAWL_URLS` (200) regardless of depth.

### `MAX_CRAWL_URLS`

Exported constant (`200`). The maximum number of URLs `crawlUrl` will return in a single call.

### `createSession()`

Returns a new unique session ID. Files captured under the same session ID are grouped together.

### `createRenderer(storage)`

Returns `{ screenshotSnippet, screenshotUrl }` bound to a custom storage adapter.

## Output formats

| Format | Notes |
|---|---|
| `png` | Lossless, default |
| `jpeg` | Lossy, quality 85, smaller file size |
| `webp` | Lossy, quality 85, best compression |
| `pdf` | Uses Puppeteer's `page.pdf()` with `printBackground: true` |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CHROMIUM_PATH` | auto-detected | Path to Chrome/Chromium binary |
| `OPENKOVA_STORAGE_PATH` | `./data` | Root directory for saved files |

## Changelog

See [openkova.dev/changelog](https://www.openkova.dev/changelog) for the full release history.

## License

MIT
