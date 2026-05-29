import { type NextRequest, NextResponse } from 'next/server';
import { createSession, screenshotSnippet } from '@openkova/core';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { html, sessionId: providedSessionId } = body as {
    html?: unknown;
    sessionId?: unknown;
  };

  if (typeof html !== 'string' || html.trim().length === 0) {
    return NextResponse.json({ error: 'html must be a non-empty string' }, { status: 400 });
  }

  const sessionId =
    typeof providedSessionId === 'string' && providedSessionId.length > 0
      ? providedSessionId
      : createSession();

  try {
    const imageId = await screenshotSnippet(html, sessionId);
    const url = `/api/image/${sessionId}/${imageId}`;
    const response = NextResponse.json({ sessionId, imageId, url });
    response.cookies.set('openkova_session', sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error('[convert/snippet]', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
