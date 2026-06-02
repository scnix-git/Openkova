import { type NextRequest } from 'next/server';
import { createSession, screenshotSnippet } from '@openkova/core';
import { sseResponse, parseViewport } from '@/lib/sse';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { html, sessionId: providedSessionId, viewport: rawViewport, fullPage } = body as {
    html?: unknown;
    sessionId?: unknown;
    viewport?: unknown;
    fullPage?: unknown;
  };

  if (typeof html !== 'string' || html.trim().length === 0) {
    return Response.json({ error: 'html must be a non-empty string' }, { status: 400 });
  }

  const sessionId =
    typeof providedSessionId === 'string' && providedSessionId.length > 0
      ? providedSessionId
      : createSession();

  const viewport = parseViewport(rawViewport);

  return sseResponse(async (send) => {
    try {
      send({ type: 'progress', message: 'Launching virtual browser' });
      const imageId = await screenshotSnippet(html, sessionId, {
        viewport,
        fullPage: fullPage === true,
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
