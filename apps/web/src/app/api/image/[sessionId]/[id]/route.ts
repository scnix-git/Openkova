import { type NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; id: string }> },
) {
  const { sessionId, id } = await params;
  let data: Buffer | null;
  try {
    data = await storage.get(sessionId, id);
  } catch {
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 });
  }

  if (!data) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = id.split('.').pop()?.toLowerCase() ?? 'png';
  const contentType = CONTENT_TYPES[ext] ?? 'image/png';

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
