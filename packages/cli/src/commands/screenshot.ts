import fs from 'node:fs/promises';
import path from 'node:path';
import { createRenderer, createSession } from '@openkova/core';
import type { OutputFormat, Viewport } from '@openkova/core';
import { CliStorageAdapter } from '../storage.js';
import { slugFromUrl, extFromImageId, uniqueFilename } from '../utils.js';

export async function runScreenshot(opts: {
  targets: string[];
  format: OutputFormat;
  viewport: Viewport;
  fullPage: boolean;
  out: string;
}): Promise<void> {
  const storage = new CliStorageAdapter(opts.out);
  const { screenshotUrl, screenshotSnippet } = createRenderer(storage);
  const sessionId = createSession();

  const failures: { target: string; message: string }[] = [];

  for (const target of opts.targets) {
    try {
      const isUrl = target.startsWith('http://') || target.startsWith('https://');
      let imageId: string;
      let slug: string;

      if (isUrl) {
        imageId = await screenshotUrl(target, sessionId, {
          format: opts.format,
          viewport: opts.viewport,
          fullPage: opts.fullPage,
          onProgress: (msg: string) => process.stdout.write(`  ${msg}\n`),
        });
        slug = slugFromUrl(target);
      } else {
        const html = await fs.readFile(target, 'utf8');
        imageId = await screenshotSnippet(html, sessionId, {
          format: opts.format,
          viewport: opts.viewport,
          fullPage: opts.fullPage,
        });
        slug = path.basename(target, path.extname(target));
      }

      const ext = extFromImageId(imageId);
      const finalName = await uniqueFilename(opts.out, slug, ext);
      await fs.rename(path.join(opts.out, imageId), path.join(opts.out, finalName));

      console.log(`✓ ${target} → ${path.join(opts.out, finalName)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${target}: ${message}`);
      failures.push({ target, message });
    }
  }

  if (opts.targets.length > 1) {
    const succeeded = opts.targets.length - failures.length;
    console.log(`\n${succeeded}/${opts.targets.length} completed`);
  }

  if (failures.length > 0) process.exit(1);
}
