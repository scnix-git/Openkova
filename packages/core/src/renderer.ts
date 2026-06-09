import puppeteer, { type Browser, type LaunchOptions, type Page } from 'puppeteer-core';
import { LocalStorageAdapter, type StorageAdapter } from './storage.js';
import { isSafeHost } from './crawler.js';

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const TIMEOUT = 30_000;

const ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
];

let launchOptionsCache: LaunchOptions | null = null;

async function getLaunchOptions(): Promise<LaunchOptions> {
  if (launchOptionsCache) return launchOptionsCache;

  if (process.env.CHROMIUM_PATH) {
    launchOptionsCache = { executablePath: process.env.CHROMIUM_PATH, args: ARGS, headless: true };
    return launchOptionsCache;
  }

  try {
    const { executablePath } = await import('puppeteer');
    launchOptionsCache = { executablePath: await executablePath(), args: ARGS, headless: true };
    return launchOptionsCache;
  } catch {
    // not installed, fall through
  }

  // Async existence check to avoid blocking the event loop
  const { access } = await import('node:fs/promises');
  const systemPaths =
    process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : process.platform === 'win32'
        ? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
        : [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
          ];

  let executablePath: string | undefined;
  for (const p of systemPaths) {
    try { await access(p); executablePath = p; break; } catch {}
  }

  if (executablePath === undefined) {
    throw new Error(
      '@openkova/core: No Chromium/Chrome executable found. ' +
      'Set CHROMIUM_PATH, install the "puppeteer" npm package, or install Chrome/Chromium system-wide.',
    );
  }

  launchOptionsCache = { executablePath, args: ARGS, headless: true };
  return launchOptionsCache;
}

// Single shared browser promise — re-checked after every await to prevent
// duplicate launches when concurrent requests arrive simultaneously.
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  let current = browserPromise;
  if (current) {
    try {
      const b = await current;
      if (b.connected) return b;
    } catch {}
    browserPromise = null;
  }

  const options = await getLaunchOptions();

  // Re-check after the await — a concurrent call may have already launched.
  current = browserPromise;
  if (current) {
    try {
      const b = await current;
      if (b.connected) return b;
    } catch {}
    browserPromise = null;
  }

  browserPromise = puppeteer.launch(options).then((b) => {
    b.on('disconnected', () => { browserPromise = null; });
    return b;
  });

  return browserPromise;
}

/** Close the shared browser instance. Called on graceful shutdown. */
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch {}
    browserPromise = null;
  }
}

process.on('exit', () => {
  if (browserPromise) browserPromise.then((b) => b.close()).catch(() => undefined);
});

export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'pdf';

const FORMAT_EXT: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  pdf: 'pdf',
};

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  viewport?: Viewport;
  fullPage?: boolean;
  /** Output file format. Defaults to `'png'`. */
  format?: OutputFormat;
  onProgress?: (msg: string) => void;
}

function wrapHtml(html: string, viewport: Viewport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${viewport.width}">
  <style>* { box-sizing: border-box; } body { margin: 0; }</style>
</head>
<body>${html}</body>
</html>`;
}

async function capture(page: Page, options: ScreenshotOptions): Promise<Buffer> {
  const format = options.format ?? 'png';
  const fullPage = options.fullPage ?? false;
  if (format === 'pdf') {
    const vp = options.viewport ?? DEFAULT_VIEWPORT;
    // When fullPage is false, constrain the PDF to viewport dimensions.
    // When fullPage is true, let puppeteer render the full scrollable document.
    const pdfOptions = fullPage
      ? { printBackground: true }
      : { printBackground: true, width: `${vp.width}px`, height: `${vp.height}px` };
    return Buffer.from(await page.pdf(pdfOptions));
  }
  const quality = format === 'png' ? undefined : 85;
  return Buffer.from(
    await page.screenshot({ type: format, fullPage, ...(quality !== undefined ? { quality } : {}) }),
  );
}

export function createRenderer(storage: StorageAdapter) {
  /**
   * Render an HTML string in a headless browser and save the result.
   * Returns the imageId (includes file extension, e.g. `"abc123.jpg"`).
   */
  async function screenshotSnippet(
    html: string,
    sessionId: string,
    options?: ScreenshotOptions,
  ): Promise<string> {
    const viewport = options?.viewport ?? DEFAULT_VIEWPORT;
    const ext = FORMAT_EXT[options?.format ?? 'png'];
    const imageId = `${crypto.randomUUID()}.${ext}`;
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      options?.onProgress?.('Rendering HTML');
      await page.setContent(wrapHtml(html, viewport), { waitUntil: 'load', timeout: TIMEOUT });
      options?.onProgress?.('Taking snapshot');
      await storage.save(sessionId, imageId, await capture(page, options ?? {}));
    } finally {
      await page.close();
    }
    return imageId;
  }

  /**
   * Navigate to a URL in a headless browser and save the result.
   * Returns the imageId (includes file extension, e.g. `"abc123.png"`).
   *
   * @throws If `url` is not http/https or targets a private/loopback host.
   */
  async function screenshotUrl(
    url: string,
    sessionId: string,
    options?: ScreenshotOptions,
  ): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`@openkova/core: URL must use http or https: ${url}`);
    }
    if (!isSafeHost(parsed.hostname)) {
      throw new Error(`@openkova/core: URL targets a private network: ${parsed.hostname}`);
    }
    const viewport = options?.viewport ?? DEFAULT_VIEWPORT;
    const ext = FORMAT_EXT[options?.format ?? 'png'];
    const imageId = `${crypto.randomUUID()}.${ext}`;
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      options?.onProgress?.(`Loading ${url}`);
      await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT });
      options?.onProgress?.('Taking snapshot');
      await storage.save(sessionId, imageId, await capture(page, options ?? {}));
    } finally {
      await page.close();
    }
    return imageId;
  }

  return { screenshotSnippet, screenshotUrl };
}

const defaultRenderer = createRenderer(new LocalStorageAdapter());
export const screenshotSnippet = defaultRenderer.screenshotSnippet;
export const screenshotUrl = defaultRenderer.screenshotUrl;
