import fs from 'node:fs/promises';
import path from 'node:path';
import { crawlUrl, createRenderer, createSession } from '@openkova/core';
import type { OutputFormat, Viewport } from '@openkova/core';
import { CliStorageAdapter } from '../storage.js';
import { slugFromUrl, extFromImageId, uniqueFilename } from '../utils.js';

export async function runCrawl(opts: {
  url: string;
  depth: 1 | 2;
  format: OutputFormat;
  viewport: Viewport;
  fullPage: boolean;
  out: string;
}): Promise<void> {
  const storage = new CliStorageAdapter(opts.out);
  const { screenshotUrl } = createRenderer(storage);
  const sessionId = createSession();

  process.stdout.write(`Crawling ${opts.url}...\n`);
  const urls = await crawlUrl(opts.url, opts.depth, (msg) =>
    process.stdout.write(`  ${msg}\n`),
  );

  let done = 0;
  for (const url of urls) {
    try {
      const imageId = await screenshotUrl(url, sessionId, {
        format: opts.format,
        viewport: opts.viewport,
        fullPage: opts.fullPage,
      });

      const ext = extFromImageId(imageId);
      const slug = slugFromUrl(url);
      const finalName = await uniqueFilename(opts.out, slug, ext);
      await fs.rename(path.join(opts.out, imageId), path.join(opts.out, finalName));

      done++;
      process.stdout.write(`  ✓ ${url} → ${finalName}\n`);
    } catch (err) {
      process.stdout.write(`  ✗ ${url} — ${(err as Error).message}\n`);
    }
  }

  console.log(`\nDone — ${done} file${done !== 1 ? 's' : ''} saved to ${opts.out}`);
}
