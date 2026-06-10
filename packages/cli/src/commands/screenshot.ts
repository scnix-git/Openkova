import fs from 'node:fs/promises';
import path from 'node:path';
import { createRenderer, createSession } from '@openkova/core';
import type { OutputFormat, Viewport } from '@openkova/core';
import { CliStorageAdapter } from '../storage.js';
import { slugFromUrl, extFromImageId, uniqueFilename } from '../utils.js';

export async function runScreenshot(opts: {
  target: string;
  format: OutputFormat;
  viewport: Viewport;
  fullPage: boolean;
  out: string;
}): Promise<void> {
  const isUrl = opts.target.startsWith('http://') || opts.target.startsWith('https://');

  const storage = new CliStorageAdapter(opts.out);
  const { screenshotUrl, screenshotSnippet } = createRenderer(storage);
  const sessionId = createSession();

  let imageId: string;
  let slug: string;

  if (isUrl) {
    imageId = await screenshotUrl(opts.target, sessionId, {
      format: opts.format,
      viewport: opts.viewport,
      fullPage: opts.fullPage,
      onProgress: (msg: string) => process.stdout.write(`  ${msg}\n`),
    });
    slug = slugFromUrl(opts.target);
  } else {
    const html = await fs.readFile(opts.target, 'utf8');
    imageId = await screenshotSnippet(html, sessionId, {
      format: opts.format,
      viewport: opts.viewport,
      fullPage: opts.fullPage,
    });
    slug = path.basename(opts.target, path.extname(opts.target));
  }

  const ext = extFromImageId(imageId);
  const finalName = await uniqueFilename(opts.out, slug, ext);
  await fs.rename(path.join(opts.out, imageId), path.join(opts.out, finalName));

  console.log(`✓ ${opts.target} → ${path.join(opts.out, finalName)}`);
}
