import { type NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  let images: string[];
  try {
    images = await storage.list(sessionId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  return NextResponse.json({ images });
}
