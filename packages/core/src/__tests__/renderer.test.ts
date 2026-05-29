import { test, before, after, describe, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import http from 'node:http';
import { createRenderer, closeBrowser } from '../renderer.js';
import { LocalStorageAdapter } from '../storage.js';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

let tmpDir: string;
let storage: LocalStorageAdapter;
let renderer: ReturnType<typeof createRenderer>;
let urlServer: http.Server;
let urlServerBase: string;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openkova-renderer-'));
  storage = new LocalStorageAdapter(tmpDir);
  renderer = createRenderer(storage);

  urlServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body style="background:#ff6b6b;">
      <h1 style="color:#fff;font-family:sans-serif;">Renderer Test</h1></body></html>`);
  });
  await new Promise<void>((resolve) =>
    urlServer.listen(0, () => {
      const addr = urlServer.address() as { port: number };
      urlServerBase = `http://localhost:${addr.port}`;
      resolve();
    }),
  );
});

after(async () => {
  await closeBrowser();
  await new Promise<void>((resolve) => urlServer.close(() => resolve()));
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function assertPng(data: Buffer, label: string) {
  assert.ok(data.length > 0, `${label}: buffer must not be empty`);
  for (let i = 0; i < 4; i++) {
    assert.equal(data[i], PNG_MAGIC[i], `${label}: invalid PNG magic at byte ${i}`);
  }
}

// ── screenshotSnippet ────────────────────────────────────────────────────────

describe('screenshotSnippet', () => {
  test('returns a UUID v4-shaped imageId', { timeout: 30_000 }, async (t: TestContext) => {
    t.diagnostic('first call — Chromium launches here');
    const imageId = await renderer.screenshotSnippet('<p>Hello</p>', 's-session-1');
    assert.match(
      imageId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('saves a valid PNG to storage', { timeout: 30_000 }, async () => {
    const imageId = await renderer.screenshotSnippet('<h1>PNG check</h1>', 's-session-2');
    const data = await storage.get('s-session-2', imageId);
    assert.ok(data !== null, 'image must be persisted');
    assertPng(data, 'screenshotSnippet');
  });

  test('styled HTML produces a non-trivially-small file', { timeout: 30_000 }, async () => {
    const html = `<div style="background:linear-gradient(135deg,#667eea,#764ba2);
      width:800px;height:400px;display:flex;align-items:center;justify-content:center;">
      <span style="color:#fff;font-size:48px;font-family:sans-serif;font-weight:bold;">
        Openkova</span></div>`;
    const imageId = await renderer.screenshotSnippet(html, 's-session-3');
    const data = await storage.get('s-session-3', imageId);
    assert.ok(data !== null && data.length > 5_000, 'styled screenshot should be >5 KB');
  });

  test('full HTML document (not just a fragment)', { timeout: 30_000 }, async () => {
    const html = `<!DOCTYPE html><html><head><title>Full doc</title></head>
      <body style="margin:0;background:#222;"><p style="color:#fff;padding:20px;">
      Full document</p></body></html>`;
    const imageId = await renderer.screenshotSnippet(html, 's-session-4');
    const data = await storage.get('s-session-4', imageId);
    assert.ok(data !== null);
    assertPng(data, 'full-doc');
  });

  test('concurrent calls in same session produce distinct IDs', { timeout: 60_000 }, async () => {
    const [id1, id2, id3] = await Promise.all([
      renderer.screenshotSnippet('<p>A</p>', 's-concurrent'),
      renderer.screenshotSnippet('<p>B</p>', 's-concurrent'),
      renderer.screenshotSnippet('<p>C</p>', 's-concurrent'),
    ]);
    const ids = new Set([id1, id2, id3]);
    assert.equal(ids.size, 3, 'each call must return a unique ID');
    const list = await storage.list('s-concurrent');
    assert.equal(list.length, 3, 'all 3 images must be persisted');
  });

  test('empty HTML body still produces a valid PNG', { timeout: 30_000 }, async () => {
    const imageId = await renderer.screenshotSnippet('', 's-empty');
    const data = await storage.get('s-empty', imageId);
    assert.ok(data !== null);
    assertPng(data, 'empty-body');
  });
});

// ── screenshotUrl ────────────────────────────────────────────────────────────

describe('screenshotUrl', () => {
  test('navigates to URL and saves a valid PNG', { timeout: 30_000 }, async () => {
    const imageId = await renderer.screenshotUrl(urlServerBase, 'u-session-1');
    const data = await storage.get('u-session-1', imageId);
    assert.ok(data !== null, 'image must be persisted');
    assertPng(data, 'screenshotUrl');
  });

  test('returns a UUID v4-shaped imageId', { timeout: 30_000 }, async () => {
    const imageId = await renderer.screenshotUrl(urlServerBase, 'u-session-2');
    assert.match(
      imageId,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test('produces a non-trivially-small file', { timeout: 30_000 }, async () => {
    const imageId = await renderer.screenshotUrl(urlServerBase, 'u-session-3');
    const data = await storage.get('u-session-3', imageId);
    assert.ok(data !== null && data.length > 2_000, 'screenshot should be >2 KB');
  });
});
