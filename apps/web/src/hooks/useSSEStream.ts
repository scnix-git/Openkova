'use client';

import { useCallback, useState } from 'react';
import type { LogLine } from '@/components/Terminal';
import { parseSSEStream } from '@/lib/sse';

export function useSSEStream() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(false);

  const addLine = useCallback((line: LogLine) => {
    setLines((prev) => [...prev, line]);
  }, []);

  const reset = useCallback(() => setLines([]), []);

  const runStream = useCallback(
    async (res: Response, onDone: (data: Record<string, unknown>) => void): Promise<void> => {
      if (!res.body) {
        addLine({ message: 'No response body', status: 'error' });
        return;
      }
      let gotDone = false;
      for await (const event of parseSSEStream(res.body)) {
        if (event.type === 'progress') {
          addLine({ message: event.message, status: 'progress' });
        } else if (event.type === 'done') {
          gotDone = true;
          addLine({ message: event.message, status: 'done' });
          onDone(event.data);
        } else if (event.type === 'error') {
          addLine({ message: event.message, status: 'error' });
          return;
        }
      }
      if (!gotDone) addLine({ message: 'Conversion failed unexpectedly', status: 'error' });
    },
    [addLine],
  );

  return { lines, loading, setLoading, addLine, reset, runStream };
}
