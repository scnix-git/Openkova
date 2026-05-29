import { type NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; id: string }> },
) {
  const { sessionId, id } = await params;
  const data = await storage.get(sessionId, id);

  if (!data) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
