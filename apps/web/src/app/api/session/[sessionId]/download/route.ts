import { type NextRequest, NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { storage } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  let imageIds: string[];
  try {
    imageIds = await storage.list(sessionId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  if (imageIds.length === 0) {
    return NextResponse.json({ error: 'No images found for this session' }, { status: 404 });
  }

  const files: Record<string, Uint8Array> = {};
  for (const imageId of imageIds) {
    const data = await storage.get(sessionId, imageId);
    if (data) {
      files[imageId] = new Uint8Array(data);
    }
  }

  const zipped = zipSync(files, { level: 0 });

  return new Response(zipped, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="openkova-screenshots.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
