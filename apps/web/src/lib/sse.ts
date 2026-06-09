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
    try {
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    } catch {
      // controller already closed — drop the event
    }
  };

  fn(send)
    .catch(() => send({ type: 'error', message: 'Internal server error' }))
    .finally(() => ctrl.close());

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
