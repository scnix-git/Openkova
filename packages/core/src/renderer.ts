import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer-core';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageAdapter, type StorageAdapter } from './storage.js';

const VIEWPORT = { width: 1280, height: 800 };
const TIMEOUT = 30_000;

const BASE_ARGS = [
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

  // Serverless (Vercel / Lambda): use @sparticuz/chromium args.
  // CHROMIUM_PATH is pre-set by instrumentation.ts during Lambda init;
  // fall back to extracting the binary here if it wasn't pre-set.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import('@sparticuz/chromium')).default;
    launchOptionsCache = {
      args: chromium.args,
      executablePath: process.env.CHROMIUM_PATH ?? (await chromium.executablePath()),
      headless: true,
    };
    return launchOptionsCache;
  }

  // Local override via env var (e.g. CI, Docker)
  if (process.env.CHROMIUM_PATH) {
    launchOptionsCache = { executablePath: process.env.CHROMIUM_PATH, args: BASE_ARGS, headless: true };
    return launchOptionsCache;
  }

  // Local dev: try puppeteer's bundled Chrome (devDependency)
  try {
    const { executablePath } = await import('puppeteer');
    launchOptionsCache = { executablePath: await executablePath(), args: BASE_ARGS, headless: true };
    return launchOptionsCache;
  } catch {
    // not installed, fall through
  }

  // Last resort: common system Chrome paths
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
  const found = systemPaths.find((p) => existsSync(p));
  launchOptionsCache = { executablePath: found, args: BASE_ARGS, headless: true };
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

function wrapHtml(html: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280">
  <style>* { box-sizing: border-box; } body { margin: 0; }</style>
</head>
<body>${html}</body>
</html>`;
}

export function createRenderer(storage: StorageAdapter) {
  async function screenshotSnippet(html: string, sessionId: string): Promise<string> {
    const imageId = uuidv4();
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport(VIEWPORT);
      await page.setContent(wrapHtml(html), { waitUntil: 'load', timeout: TIMEOUT });
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
      await storage.save(sessionId, imageId, Buffer.from(buffer));
    } finally {
      await page.close();
    }
    return imageId;
  }

  async function screenshotUrl(url: string, sessionId: string): Promise<string> {
    const imageId = uuidv4();
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport(VIEWPORT);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: TIMEOUT });
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
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
