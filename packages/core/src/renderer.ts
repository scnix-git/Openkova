import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer-core';
import { LocalStorageAdapter, type StorageAdapter } from './storage.js';

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

  // Explicit path via env var (Docker / CI / Railway sets CHROMIUM_PATH)
  if (process.env.CHROMIUM_PATH) {
    launchOptionsCache = { executablePath: process.env.CHROMIUM_PATH, args: ARGS, headless: true };
    return launchOptionsCache;
  }

  // Local dev: puppeteer devDependency bundles its own Chrome
  try {
    const { executablePath } = await import('puppeteer');
    launchOptionsCache = { executablePath: await executablePath(), args: ARGS, headless: true };
    return launchOptionsCache;
  } catch {
    // not installed, fall through
  }

  // Fallback: common system Chrome paths
  const { existsSync } = await import('fs');
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
  launchOptionsCache = { executablePath: systemPaths.find((p) => existsSync(p)), args: ARGS, headless: true };
  return launchOptionsCache;
}

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const b = await browserPromise;
    if (b.connected) return b;
    browserPromise = null;
  }
  const options = await getLaunchOptions();
  browserPromise = puppeteer.launch(options);
  const b = await browserPromise;
  b.on('disconnected', () => {
    browserPromise = null;
  });
  return b;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

process.on('exit', () => {
  if (browserPromise) {
    browserPromise.then((b) => b.close()).catch(() => undefined);
  }
});

export interface Viewport {
  width: number;
  height: number;
}

export interface ScreenshotOptions {
  viewport?: Viewport;
  fullPage?: boolean;
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

export function createRenderer(storage: StorageAdapter) {
  async function screenshotSnippet(
    html: string,
    sessionId: string,
    options?: ScreenshotOptions,
  ): Promise<string> {
    const viewport = options?.viewport ?? DEFAULT_VIEWPORT;
    const imageId = crypto.randomUUID();
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      options?.onProgress?.('Rendering HTML');
      await page.setContent(wrapHtml(html, viewport), { waitUntil: 'load', timeout: TIMEOUT });
      options?.onProgress?.('Taking snapshot');
      const buffer = await page.screenshot({ type: 'png', fullPage: options?.fullPage ?? false });
      await storage.save(sessionId, imageId, Buffer.from(buffer));
    } finally {
      await page.close();
    }
    return imageId;
  }

  async function screenshotUrl(
    url: string,
    sessionId: string,
    options?: ScreenshotOptions,
  ): Promise<string> {
    const viewport = options?.viewport ?? DEFAULT_VIEWPORT;
    const imageId = crypto.randomUUID();
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport(viewport);
      options?.onProgress?.(`Loading ${url}`);
      await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT });
      options?.onProgress?.('Taking snapshot');
      const buffer = await page.screenshot({ type: 'png', fullPage: options?.fullPage ?? false });
      await storage.save(sessionId, imageId, Buffer.from(buffer));
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
