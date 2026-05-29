import { type NextRequest, NextResponse } from 'next/server';
import { createSession, screenshotSnippet } from '@openkova/core';

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const rawFiles = formData.getAll('files');
  const files = rawFiles.filter((f) => f instanceof Blob && f.size > 0) as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: 'No HTML files provided' }, { status: 400 });
  }

  const providedSessionId = formData.get('sessionId');
  const sessionId =
    typeof providedSessionId === 'string' && providedSessionId.length > 0
      ? providedSessionId
      : createSession();

  try {
    const results = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const html = buffer.toString('utf-8');
        const imageId = await screenshotSnippet(html, sessionId);
        return { imageId, filename: file.name, url: `/api/image/${sessionId}/${imageId}` };
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
    console.error('[convert/file]', err);
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
