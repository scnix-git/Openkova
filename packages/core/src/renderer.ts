import puppeteer, { type Browser } from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
import { LocalStorageAdapter, type StorageAdapter } from './storage.js';

const VIEWPORT = { width: 1280, height: 800 };
const TIMEOUT = 30_000;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
];

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const b = await browserPromise;
    if (b.connected) return b;
    browserPromise = null;
  }
  browserPromise = puppeteer.launch({ headless: true, args: LAUNCH_ARGS });
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
      await page.setContent(wrapHtml(html), { waitUntil: 'networkidle0', timeout: TIMEOUT });
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
