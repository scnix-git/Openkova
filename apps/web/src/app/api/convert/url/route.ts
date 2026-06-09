import { type NextRequest } from 'next/server';
import { createSession, screenshotUrl, crawlUrl, isSafeHost } from '@openkova/core';
import { sseResponse } from '@/lib/sse';
import { parseFormat, parseViewport } from '@/lib/parse';

const PAGE_SIZE = 10;
const MAX_DIRECT_URLS = PAGE_SIZE;

function isSafeUrl(url: string): boolean {
  try {
    return isSafeHost(new URL(url).hostname);
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
    if (urls.length > MAX_DIRECT_URLS) {
      return Response.json({ error: `Too many URLs per request (max ${MAX_DIRECT_URLS})` }, { status: 400 });
    }
    const blocked = urls.find((u) => !isSafeUrl(u));
    if (blocked) {
      return Response.json({ error: `URL targets a private network: ${blocked}` }, { status: 400 });
    }

    const sessionId = resolveSessionId(raw.sessionId);
    const offset = typeof raw.offset === 'number' && raw.offset >= 0 ? raw.offset : 0;
    const total = typeof raw.total === 'number' && raw.total > 0 ? raw.total : null;

    return sseResponse(async (send) => {
      try {
        send({ type: 'progress', message: 'Launching virtual browser' });
        const results: { imageId: string; url: string }[] = [];

        for (let i = 0; i < urls.length; i++) {
          const u = urls[i]!;
          const pageNum = total !== null ? `${offset + i + 1}/${total}` : `${offset + i + 1}`;
          send({ type: 'progress', message: `Capturing page ${pageNum}: ${u}` });
          const imageId = await screenshotUrl(u, sessionId, { viewport, fullPage, format });
          results.push({ imageId, url: u });
        }

        const captured = offset + results.length;
        const doneMsg =
          total !== null
            ? captured >= total
              ? `Done — all ${total} page${total !== 1 ? 's' : ''} captured`
              : `Captured ${captured} of ${total} pages`
            : `Captured ${results.length} page${results.length !== 1 ? 's' : ''}`;

        send({ type: 'done', message: doneMsg, data: { sessionId, results, total: total ?? captured } });
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

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return Response.json({ error: 'url is not a valid URL' }, { status: 400 });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return Response.json({ error: 'url must use http or https' }, { status: 400 });
  }

  if (!isSafeHost(parsedUrl.hostname)) {
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
