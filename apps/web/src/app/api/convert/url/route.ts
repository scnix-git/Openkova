import { type NextRequest } from 'next/server';
import { createSession, screenshotUrl, crawlUrl } from '@openkova/core';
import { sseResponse } from '@/lib/sse';
import { parseFormat, parseViewport } from '@/lib/parse';

const PAGE_SIZE = 10;

// Block SSRF: private/loopback ranges (mirrors the check in @openkova/core crawler).
const PRIVATE_HOST_RE = /^(localhost|.*\.local)$/i;
const PRIVATE_IP_RE =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|::1$|fc[\da-f]{2}:|fe80:)/i;

function isSafeUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return !PRIVATE_HOST_RE.test(hostname) && !PRIVATE_IP_RE.test(hostname);
  } catch {
    return false;
  }
}

function resolveSessionId(raw: unknown): string {
  return typeof raw === 'string' && raw.length > 0 ? raw : createSession();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const viewport = parseViewport(raw.viewport);
  const fullPage = raw.fullPage === true;
  const format = parseFormat(raw.format);

  // ── Direct mode: screenshot a pre-known list of URLs (pagination) ──────────
  if (Array.isArray(raw.urls)) {
    const urls = (raw.urls as unknown[]).filter((u): u is string => typeof u === 'string');
    if (urls.length === 0) {
      return Response.json({ error: 'urls must be a non-empty array of strings' }, { status: 400 });
    }
    const blocked = urls.find((u) => !isSafeUrl(u));
    if (blocked) {
      return Response.json({ error: `URL targets a private network: ${blocked}` }, { status: 400 });
    }

    const sessionId = resolveSessionId(raw.sessionId);
    const offset = typeof raw.offset === 'number' ? raw.offset : 0;
    const total = typeof raw.total === 'number' ? raw.total : urls.length + offset;

    return sseResponse(async (send) => {
      try {
        send({ type: 'progress', message: 'Launching virtual browser' });
        const results: { imageId: string; url: string }[] = [];

        for (let i = 0; i < urls.length; i++) {
          const u = urls[i]!;
          send({ type: 'progress', message: `Capturing page ${offset + i + 1}/${total}: ${u}` });
          const imageId = await screenshotUrl(u, sessionId, { viewport, fullPage, format });
          results.push({ imageId, url: u });
        }

        const captured = offset + results.length;
        const doneMsg =
          captured >= total
            ? `Done — all ${total} page${total !== 1 ? 's' : ''} captured`
            : `Captured ${captured} of ${total} pages`;

        send({ type: 'done', message: doneMsg, data: { sessionId, results, total } });
      } catch (err) {
        console.error('[convert/url]', err);
        send({ type: 'error', message: 'Conversion failed' });
      }
    }, sessionId);
  }

  // ── Crawl mode: discover URLs then screenshot the first PAGE_SIZE ──────────
  const { url, sessionId: providedSessionId, depth } = raw as {
    url?: unknown;
    sessionId?: unknown;
    depth?: unknown;
  };

  if (typeof url !== 'string' || url.trim().length === 0) {
    return Response.json({ error: 'url must be a non-empty string' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return Response.json({ error: 'url is not a valid URL' }, { status: 400 });
  }

  const scheme = new URL(url).protocol;
  if (scheme !== 'http:' && scheme !== 'https:') {
    return Response.json({ error: 'url must use http or https' }, { status: 400 });
  }

  if (!isSafeUrl(url)) {
    return Response.json({ error: 'URL targets a private network' }, { status: 400 });
  }

  const crawlDepth = typeof depth === 'number' && depth >= 1 && depth <= 2 ? Math.floor(depth) : 1;
  const sessionId = resolveSessionId(providedSessionId);

  return sseResponse(async (send) => {
    try {
      const allUrls = await crawlUrl(url, crawlDepth, (msg) =>
        send({ type: 'progress', message: msg }),
      );

      const total = allUrls.length;
      const batch = allUrls.slice(0, PAGE_SIZE);
      const remaining = allUrls.slice(PAGE_SIZE);

      send({ type: 'progress', message: 'Launching virtual browser' });
      const results: { imageId: string; url: string }[] = [];

      for (let i = 0; i < batch.length; i++) {
        const u = batch[i]!;
        send({ type: 'progress', message: `Capturing page ${i + 1}/${total}: ${u}` });
        const imageId = await screenshotUrl(u, sessionId, { viewport, fullPage, format });
        results.push({ imageId, url: u });
      }

      const captured = results.length;
      const doneMsg =
        captured >= total
          ? `Done — all ${total} page${total !== 1 ? 's' : ''} captured`
          : `Captured ${captured} of ${total} pages`;

      send({ type: 'done', message: doneMsg, data: { sessionId, results, remaining, total } });
    } catch (err) {
      console.error('[convert/url]', err);
      send({ type: 'error', message: 'Conversion failed' });
    }
  }, sessionId);
}
