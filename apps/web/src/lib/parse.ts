import type { OutputFormat } from '@openkova/core';

export { parseViewport } from './sse';

const VALID_FORMATS = new Set<OutputFormat>(['png', 'jpeg', 'webp', 'pdf']);

export function parseFormat(raw: unknown): OutputFormat {
  return VALID_FORMATS.has(raw as OutputFormat) ? (raw as OutputFormat) : 'png';
}
