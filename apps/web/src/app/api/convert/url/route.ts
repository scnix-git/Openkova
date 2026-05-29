import { type NextRequest, NextResponse } from 'next/server';
import { createSession, screenshotUrl, crawlUrl } from '@openkova/core';

const MAX_URLS = 10;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, sessionId: providedSessionId, depth } = body as {
    url?: unknown;
    sessionId?: unknown;
    depth?: unknown;
  };

  if (typeof url !== 'string' || url.trim().length === 0) {
    return NextResponse.json({ error: 'url must be a non-empty string' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'url is not a valid URL' }, { status: 400 });
  }

  const crawlDepth = typeof depth === 'number' && depth >= 1 && depth <= 2 ? Math.floor(depth) : 1;

  const sessionId =
    typeof providedSessionId === 'string' && providedSessionId.length > 0
      ? providedSessionId
      : createSession();

  try {
    const urls = (await crawlUrl(url, crawlDepth)).slice(0, MAX_URLS);

    const results = await Promise.all(
      urls.map(async (u) => {
        const imageId = await screenshotUrl(u, sessionId);
        return { imageId, url: u };
      }),
    );

    const response = NextResponse.json({ sessionId, results });
    response.cookies.set('openkova_session', sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error('[convert/url]', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
