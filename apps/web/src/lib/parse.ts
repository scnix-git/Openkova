import type { OutputFormat, Viewport } from '@openkova/core';
import { createSession } from '@openkova/core';

export type { Viewport };

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

const VALID_FORMATS = new Set<OutputFormat>(['png', 'jpeg', 'webp', 'pdf']);

export function parseFormat(raw: unknown): OutputFormat {
  return VALID_FORMATS.has(raw as OutputFormat) ? (raw as OutputFormat) : 'png';
}

export function resolveSessionId(raw: unknown): string {
  return typeof raw === 'string' && raw.length > 0 ? raw : createSession();
}
