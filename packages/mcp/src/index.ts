#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRenderer, createSession, crawlUrl, closeBrowser } from '@openkova/core';
import type { StorageAdapter, OutputFormat, Viewport } from '@openkova/core';

const DEFAULT_OUT = process.env['KOVA_OUTPUT_DIR'] ?? './kova-screenshots';

// Captures each saved buffer in memory so we can return it as base64 without
// a second disk read. One instance per tool call — safe for sequential use.
class CapturingStorageAdapter implements StorageAdapter {
  private _buffer: Buffer | null = null;
  private _imageId: string | null = null;

  async save(_sessionId: string, imageId: string, data: Buffer): Promise<void> {
    this._buffer = data;
    this._imageId = imageId;
  }

  pop(): { buffer: Buffer; imageId: string } | null {
    if (!this._buffer || !this._imageId) return null;
    const result = { buffer: this._buffer, imageId: this._imageId };
    this._buffer = null;
    this._imageId = null;
    return result;
  }

  async get(_sessionId: string, _imageId: string): Promise<Buffer | null> { return null; }
  async list(_sessionId: string): Promise<string[]> { return []; }
  async delete(_sessionId: string, _imageId: string): Promise<void> {}
}

function extFromImageId(imageId: string): string {
  return imageId.split('.').pop() ?? 'png';
}

function mimeType(ext: string): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = [u.hostname, ...u.pathname.split('/').filter(Boolean)];
    return parts.join('-').replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
  } catch {
    return 'screenshot';
  }
}

const sharedInputs = {
  format: z.enum(['png', 'jpeg', 'webp', 'pdf']).optional().describe('Output format (default: png)'),
  viewport_width: z.number().optional().describe('Viewport width in pixels (default: 1280)'),
  full_page: z.boolean().optional().describe('Capture full scrollable height (default: false)'),
  out: z.string().optional().describe(`Directory to save files (default: ${DEFAULT_OUT})`),
};

function resolveOptions(args: {
  format?: 'png' | 'jpeg' | 'webp' | 'pdf';
  viewport_width?: number;
  full_page?: boolean;
  out?: string;
}): { format: OutputFormat; viewport: Viewport; fullPage: boolean; outDir: string } {
  return {
    format: args.format ?? 'png',
    viewport: { width: args.viewport_width ?? 1280, height: 800 },
    fullPage: args.full_page ?? false,
    outDir: path.resolve(args.out ?? DEFAULT_OUT),
  };
}

const server = new McpServer({ name: 'kova', version: '0.1.0' });

server.registerTool(
  'screenshot_url',
  {
    description: 'Screenshot a live URL using a local headless Chromium browser.',
    inputSchema: {
      url: z.string().describe('The URL to screenshot (must be http/https on a public host)'),
      ...sharedInputs,
    },
  },
  async (args) => {
    const { format, viewport, fullPage, outDir } = resolveOptions(args);

    const storage = new CapturingStorageAdapter();
    const { screenshotUrl } = createRenderer(storage);
    const sessionId = createSession();

    const imageId = await screenshotUrl(args.url, sessionId, { format, viewport, fullPage });
    const captured = storage.pop()!;
    const ext = extFromImageId(imageId);
    const slug = slugFromUrl(args.url);
    const filePath = path.join(outDir, `${slug}.${ext}`);

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(filePath, captured.buffer);

    if (format === 'pdf') {
      return { content: [{ type: 'text' as const, text: `Screenshot saved to ${filePath}` }] };
    }

    return {
      content: [
        { type: 'image' as const, data: captured.buffer.toString('base64'), mimeType: mimeType(ext) },
        { type: 'text' as const, text: `Saved to ${filePath}` },
      ],
    };
  },
);

server.registerTool(
  'screenshot_snippet',
  {
    description: 'Render an HTML string in a local headless Chromium browser and return the screenshot.',
    inputSchema: {
      html: z.string().describe('HTML content to render'),
      name: z.string().optional().describe('Output filename without extension (default: snippet)'),
      ...sharedInputs,
    },
  },
  async (args) => {
    const { format, viewport, fullPage, outDir } = resolveOptions(args);

    const storage = new CapturingStorageAdapter();
    const { screenshotSnippet } = createRenderer(storage);
    const sessionId = createSession();

    const imageId = await screenshotSnippet(args.html, sessionId, { format, viewport, fullPage });
    const captured = storage.pop()!;
    const ext = extFromImageId(imageId);
    const baseName = args.name ?? 'snippet';
    const filePath = path.join(outDir, `${baseName}.${ext}`);

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(filePath, captured.buffer);

    if (format === 'pdf') {
      return { content: [{ type: 'text' as const, text: `Saved to ${filePath}` }] };
    }

    return {
      content: [
        { type: 'image' as const, data: captured.buffer.toString('base64'), mimeType: mimeType(ext) },
        { type: 'text' as const, text: `Saved to ${filePath}` },
      ],
    };
  },
);

server.registerTool(
  'crawl_url',
  {
    description: 'Crawl a site, discover all same-origin pages, and screenshot each one. Returns file paths.',
    inputSchema: {
      url: z.string().describe('The root URL to crawl'),
      depth: z.union([z.literal(1), z.literal(2)]).optional().describe('Crawl depth: 1 = root + direct links, 2 = follow one level further (default: 1)'),
      ...sharedInputs,
    },
  },
  async (args) => {
    const { format, viewport, fullPage, outDir } = resolveOptions(args);
    const depth = (args.depth ?? 1) as 1 | 2;

    const urls = await crawlUrl(args.url, depth);

    const storage = new CapturingStorageAdapter();
    const { screenshotUrl } = createRenderer(storage);
    const sessionId = createSession();

    await fs.mkdir(outDir, { recursive: true });

    const seenSlugs = new Set<string>();
    const results: Array<{ url: string; file: string }> = [];
    const errors: Array<{ url: string; error: string }> = [];

    for (const u of urls) {
      try {
        const imageId = await screenshotUrl(u, sessionId, { format, viewport, fullPage });
        const captured = storage.pop()!;
        const ext = extFromImageId(imageId);

        let slug = slugFromUrl(u);
        let counter = 1;
        while (seenSlugs.has(slug)) slug = `${slugFromUrl(u)}-${counter++}`;
        seenSlugs.add(slug);

        const filePath = path.join(outDir, `${slug}.${ext}`);
        await fs.writeFile(filePath, captured.buffer);
        results.push({ url: u, file: filePath });
      } catch (err) {
        errors.push({ url: u, error: (err as Error).message });
      }
    }

    const lines = [
      `Crawled ${args.url} — ${results.length} screenshot${results.length !== 1 ? 's' : ''} saved to ${outDir}`,
      '',
      ...results.map((r) => `  ✓ ${r.url}\n    → ${r.file}`),
      ...(errors.length ? ['', 'Errors:', ...errors.map((e) => `  ✗ ${e.url}: ${e.error}`)] : []),
    ];

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

process.on('SIGINT', async () => {
  await closeBrowser();
  await server.close();
  process.exit(0);
});
