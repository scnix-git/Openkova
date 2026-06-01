import { type NextRequest } from 'next/server';
import { createSession, screenshotUrl, crawlUrl } from '@openkova/core';
import { sseResponse } from '@/lib/sse';

const MAX_URLS = 10;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, sessionId: providedSessionId, depth } = body as {
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

  const crawlDepth = typeof depth === 'number' && depth >= 1 && depth <= 2 ? Math.floor(depth) : 1;
  const sessionId =
    typeof providedSessionId === 'string' && providedSessionId.length > 0
      ? providedSessionId
      : createSession();

  return sseResponse(async (send) => {
    try {
      const urls = (
        await crawlUrl(url, crawlDepth, (msg) => send({ type: 'progress', message: msg }))
      ).slice(0, MAX_URLS);

      const total = urls.length;
      send({ type: 'progress', message: 'Launching virtual browser' });

      const results: { imageId: string; url: string }[] = [];
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i]!;
        send({ type: 'progress', message: `Capturing page ${i + 1}/${total}: ${u}` });
        const imageId = await screenshotUrl(u, sessionId);
        results.push({ imageId, url: u });
      }

      send({
        type: 'done',
        message: `Done — ${total} screenshot${total !== 1 ? 's' : ''} saved`,
        data: { sessionId, results },
      });
    } catch (err) {
      console.error('[convert/url]', err);
      send({ type: 'error', message: 'Conversion failed' });
    }
  }, sessionId);
}
