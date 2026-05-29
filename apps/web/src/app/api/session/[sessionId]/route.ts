import { type NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const images = await storage.list(sessionId);
  return NextResponse.json({ images });
}
