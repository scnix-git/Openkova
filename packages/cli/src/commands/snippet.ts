import fs from 'node:fs/promises';
import path from 'node:path';
import { createRenderer, createSession } from '@openkova/core';
import type { OutputFormat, Viewport } from '@openkova/core';
import { CliStorageAdapter } from '../storage.js';
import { extFromImageId, uniqueFilename } from '../utils.js';

export async function runSnippet(opts: {
  html: string;
  format: OutputFormat;
  viewport: Viewport;
  fullPage: boolean;
  out: string;
  name: string;
}): Promise<void> {
  const storage = new CliStorageAdapter(opts.out);
  const { screenshotSnippet } = createRenderer(storage);
  const sessionId = createSession();

  const imageId = await screenshotSnippet(opts.html, sessionId, {
    format: opts.format,
    viewport: opts.viewport,
    fullPage: opts.fullPage,
  });

  const ext = extFromImageId(imageId);
  const finalName = await uniqueFilename(opts.out, opts.name, ext);
  await fs.rename(path.join(opts.out, imageId), path.join(opts.out, finalName));

  console.log(`✓ saved to ${path.join(opts.out, finalName)}`);
}
