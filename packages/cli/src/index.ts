#!/usr/bin/env node
import { parseArgs } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { closeBrowser } from '@openkova/core';
import type { OutputFormat, Viewport } from '@openkova/core';
import { runScreenshot } from './commands/screenshot.js';
import { runSnippet } from './commands/snippet.js';
import { runCrawl } from './commands/crawl.js';

const HELP = `
kova — HTML to image CLI

Commands:
  kova screenshot <url|file> [url2 ...]   Screenshot one or more URLs or local HTML files
  kova snippet                            Screenshot HTML from --html flag or stdin
  kova crawl <url>                        Crawl a site and screenshot all pages

Flags:
  --format    png|jpeg|webp|pdf    Output format (default: png)
  --viewport  390|1280|1920        Viewport width in px, or mobile/desktop/wide (default: 1280)
  --full-page                      Capture full scrollable height
  --out       <dir>                Output directory (default: current directory)
  --batch     <file>               File of URLs/paths to screenshot, one per line (screenshot command only)
  --depth     1|2                  Crawl depth, crawl command only (default: 1)
  --html      "<html>"             HTML string, snippet command only
  --name      <filename>           Output filename without extension, snippet command only (default: snippet)
  --help                           Show this help
`.trim();

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    format:      { type: 'string',  default: 'png' },
    viewport:    { type: 'string',  default: '1280' },
    'full-page': { type: 'boolean', default: false },
    out:         { type: 'string',  default: '.' },
    depth:       { type: 'string',  default: '1' },
    batch:       { type: 'string' },
    html:        { type: 'string' },
    name:        { type: 'string',  default: 'snippet' },
    help:        { type: 'boolean', default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(HELP);
  process.exit(0);
}

function parseViewport(raw: string): Viewport {
  if (raw === 'mobile')  return { width: 390,  height: 800 };
  if (raw === 'desktop') return { width: 1280, height: 800 };
  if (raw === 'wide')    return { width: 1920, height: 800 };
  const w = parseInt(raw, 10);
  return { width: isNaN(w) ? 1280 : w, height: 800 };
}

function parseFormat(raw: string): OutputFormat {
  if (['png', 'jpeg', 'webp', 'pdf'].includes(raw)) return raw as OutputFormat;
  console.error(`Unknown format: ${raw}. Must be png, jpeg, webp, or pdf.`);
  process.exit(1);
}

const command  = positionals[0]!;
const format   = parseFormat(values.format ?? 'png');
const viewport = parseViewport(values.viewport ?? '1280');
const fullPage = values['full-page'] ?? false;
const out      = path.resolve(values.out ?? '.');

async function main(): Promise<void> {
  switch (command) {
    case 'screenshot': {
      const targets = positionals.slice(1);
      if (values.batch) {
        const raw = await fs.readFile(values.batch, 'utf8');
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
        targets.push(...lines);
      }
      if (targets.length === 0) {
        console.error('Error: URL or file path required\n\nUsage: kova screenshot <url|file> [url2 ...]\n       kova screenshot --batch urls.txt');
        process.exit(1);
      }
      await runScreenshot({ targets, format, viewport, fullPage, out });
      break;
    }

    case 'snippet': {
      let html = values.html;
      if (!html) {
        if (process.stdin.isTTY) {
          console.error('Error: provide HTML via --html or pipe it to stdin\n\nUsage: kova snippet --html "<h1>Hello</h1>"');
          process.exit(1);
        }
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
        html = Buffer.concat(chunks).toString('utf8');
      }
      if (!html.trim()) {
        console.error('Error: HTML is empty');
        process.exit(1);
      }
      await runSnippet({ html, format, viewport, fullPage, out, name: values.name ?? 'snippet' });
      break;
    }

    case 'crawl': {
      const url = positionals[1];
      if (!url) {
        console.error('Error: URL required\n\nUsage: kova crawl <url>');
        process.exit(1);
      }
      const depthRaw = parseInt(values.depth ?? '1', 10);
      const depth = (depthRaw === 2 ? 2 : 1) as 1 | 2;
      await runCrawl({ url, depth, format, viewport, fullPage, out });
      break;
    }

    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? `Error: ${err.message}` : err);
    process.exit(1);
  })
  .finally(() => closeBrowser());
