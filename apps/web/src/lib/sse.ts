export interface Viewport {
  width: number;
  height: number;
}

export function parseViewport(raw: unknown): Viewport | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { width, height } = raw as Record<string, unknown>;
  if (
    typeof width === 'number' && typeof height === 'number' &&
    Number.isInteger(width) && Number.isInteger(height) &&
    width >= 320 && width <= 3840 && height >= 240 && height <= 2160
  ) {
    return { width, height };
  }
  return undefined;
}

export type SSEEvent =
  | { type: 'progress'; message: string }
  | { type: 'done'; message: string; data: Record<string, unknown> }
  | { type: 'error'; message: string };

// Cookie TTL: 7 days (independent of the 24-hour storage cleanup)
const SESSION_COOKIE_TTL_SECS = 60 * 60 * 24 * 7;

export function sseResponse(
  fn: (send: (event: SSEEvent) => void) => Promise<void>,
  sessionId: string,
): Response {
  const encoder = new TextEncoder();
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
    },
  });

  const send = (event: SSEEvent) => {
    ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  fn(send).finally(() => ctrl.close());

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Set-Cookie': `openkova_session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_COOKIE_TTL_SECS}`,
    },
  });
}

export async function* parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
        if (!dataLine) continue;
        try {
          yield JSON.parse(dataLine.slice(6)) as SSEEvent;
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }
}
