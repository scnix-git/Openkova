import { type NextRequest } from 'next/server';
import { screenshotSnippet } from '@openkova/core';
import { sseResponse } from '@/lib/sse';
import { parseFormat, parseViewport, resolveSessionId } from '@/lib/parse';
import { MAX_HTML_BYTES } from '@/lib/config';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { html, sessionId: providedSessionId, viewport: rawViewport, fullPage, format: rawFormat } = body as {
    html?: unknown;
    sessionId?: unknown;
    viewport?: unknown;
    fullPage?: unknown;
    format?: unknown;
  };

  if (typeof html !== 'string' || html.trim().length === 0) {
    return Response.json({ error: 'html must be a non-empty string' }, { status: 400 });
  }

  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return Response.json({ error: 'html exceeds 5 MB limit' }, { status: 413 });
  }

  const sessionId = resolveSessionId(providedSessionId);
  const viewport = parseViewport(rawViewport);
  const format = parseFormat(rawFormat);

  return sseResponse(async (send) => {
    try {
      send({ type: 'progress', message: 'Launching virtual browser' });
      const imageId = await screenshotSnippet(html, sessionId, {
        viewport,
        fullPage: fullPage === true,
        format,
        onProgress: (msg) => send({ type: 'progress', message: msg }),
      });
      send({
        type: 'done',
        message: 'Done — screenshot saved',
        data: { sessionId, imageId, url: `/api/image/${sessionId}/${imageId}` },
      });
    } catch (err) {
      console.error('[convert/snippet]', err);
      send({ type: 'error', message: 'Conversion failed' });
    }
  }, sessionId);
}
