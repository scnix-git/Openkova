# @openkova/core

HTML to PNG screenshot engine powered by Puppeteer. Render snippets, local HTML files, or live URLs to pixel-accurate images — with configurable viewport, full-page capture, and pluggable storage.

**Website & docs:** [openkova.dev](https://www.openkova.dev)

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
  onProgress: (msg) => console.log(msg),
});
// PNG saved to ./data/<sessionId>/<imageId>.png
```

### Screenshot a URL

```js
import { screenshotUrl, createSession } from '@openkova/core';

const sessionId = createSession();
const imageId = await screenshotUrl('https://example.com', sessionId, {
  viewport: { width: 1280, height: 800 },
  fullPage: true,
});
```

### Crawl a site and screenshot all pages

```js
import { crawlUrl, screenshotUrl, createSession } from '@openkova/core';

const sessionId = createSession();
const urls = await crawlUrl('https://example.com', 1); // depth 1 = root + linked pages
for (const url of urls) {
  await screenshotUrl(url, sessionId);
}
```

### Custom storage

By default screenshots are saved to `./data` (overridable via `OPENKOVA_STORAGE_PATH`). Pass a custom `StorageAdapter` for full control:

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

## API

### `screenshotSnippet(html, sessionId, options?)`

Wraps the HTML string in a full document (with meta viewport) and screenshots it.

| Option | Type | Default | Description |
|---|---|---|---|
| `viewport` | `{ width, height }` | `1280×800` | Browser viewport size |
| `fullPage` | `boolean` | `false` | Capture full scrollable height |
| `onProgress` | `(msg: string) => void` | — | Progress callback |

### `screenshotUrl(url, sessionId, options?)`

Navigates to a live URL and screenshots it. Accepts the same options as `screenshotSnippet`.

### `crawlUrl(rootUrl, depth?, onProgress?)`

Fetches `rootUrl`, extracts same-origin `<a href>` links, and returns the full list of URLs to capture. `depth` can be `1` (root + its links) or `2` (follow links one level further).

### `createSession()`

Returns a new unique session ID. Screenshots captured under the same session ID are grouped together.

### `createRenderer(storage)`

Returns `{ screenshotSnippet, screenshotUrl }` bound to a custom storage adapter.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CHROMIUM_PATH` | auto-detected | Path to Chrome/Chromium binary |
| `OPENKOVA_STORAGE_PATH` | `./data` | Root directory for saved screenshots |

## License

MIT
