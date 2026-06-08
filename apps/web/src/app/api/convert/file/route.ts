import { type NextRequest } from 'next/server';
import { type OutputFormat, createSession, screenshotSnippet } from '@openkova/core';
import { sseResponse, parseViewport } from '@/lib/sse';

const VALID_FORMATS = new Set<OutputFormat>(['png', 'jpeg', 'webp', 'pdf']);

function parseFormat(raw: unknown): OutputFormat {
  return VALID_FORMATS.has(raw as OutputFormat) ? (raw as OutputFormat) : 'png';
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const rawFiles = formData.getAll('files');
  const files = rawFiles.filter((f) => f instanceof Blob && f.size > 0) as File[];

  if (files.length === 0) {
    return Response.json({ error: 'No HTML files provided' }, { status: 400 });
  }

  const providedSessionId = formData.get('sessionId');
  const sessionId =
    typeof providedSessionId === 'string' && providedSessionId.length > 0
      ? providedSessionId
      : createSession();

  const rawViewport = formData.get('viewport');
  const viewport = parseViewport(rawViewport ? JSON.parse(rawViewport as string) : null);
  const fullPage = formData.get('fullPage') === 'true';
  const format = parseFormat(formData.get('format'));

  return sseResponse(async (send) => {
    try {
      send({ type: 'progress', message: 'Launching virtual browser' });

      const results: { imageId: string; filename: string; url: string }[] = [];
      for (const file of files) {
        send({ type: 'progress', message: `Rendering ${file.name}` });
        const buffer = Buffer.from(await file.arrayBuffer());
        const html = buffer.toString('utf-8');
        const imageId = await screenshotSnippet(html, sessionId, { viewport, fullPage, format });
        results.push({ imageId, filename: file.name, url: `/api/image/${sessionId}/${imageId}` });
      }

      const total = results.length;
      send({
        type: 'done',
        message: `Done — ${total} screenshot${total !== 1 ? 's' : ''} saved`,
        data: { sessionId, results },
      });
    } catch (err) {
      console.error('[convert/file]', err);
      send({ type: 'error', message: 'Conversion failed' });
    }
  }, sessionId);
}
