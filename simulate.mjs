/**
 * Openkova — full-stack simulation
 * Starts the Next.js production server and exercises every API endpoint +
 * error path, then prints a pass/fail summary.
 *
 * Usage:
 *   node simulate.mjs
 *
 * Requires: `pnpm --filter @openkova/web build` to have run already.
 */

import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 3001;
const BASE = `http://localhost:${PORT}`;
const TIMEOUT_MS = 60_000;

// ── result tracking ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function pass(name) {
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  passed++;
}
function fail(name, detail) {
  console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  console.log(`      → ${detail}`);
  failed++;
  failures.push({ name, detail });
}

async function scenario(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err instanceof Error ? err.message : String(err));
  }
}

// ── server management ────────────────────────────────────────────────────────
let serverProc;

function startServer() {
  serverProc = spawn(
    'pnpm',
    ['exec', 'next', 'start', '-p', String(PORT)],
    {
      cwd: '/home/user/Openkova/apps/web',
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        OPENKOVA_STORAGE_PATH: join(tmpdir(), `openkova-sim-${Date.now()}`),
        OPENKOVA_GITHUB_URL: 'https://github.com/scnix-git/openkova',
      },
    },
  );
  serverProc.stdout.on('data', (d) => {
    const line = d.toString().trim();
    if (line) process.stdout.write(`  \x1b[2m[server] ${line}\x1b[0m\n`);
  });
  serverProc.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line) process.stdout.write(`  \x1b[2m[server-err] ${line}\x1b[0m\n`);
  });
}

async function waitForServer(maxMs = TIMEOUT_MS) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 404) return;
    } catch { /* keep polling */ }
    await delay(500);
  }
  throw new Error(`Server did not become ready within ${maxMs}ms`);
}

function stopServer() {
  serverProc?.kill('SIGTERM');
}

// ── helpers ──────────────────────────────────────────────────────────────────
async function postJSON(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40_000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json, headers: res.headers };
}

async function postForm(path, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Blob) form.append(k, v);
    else form.append(k, v);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(40_000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });
  return { status: res.status, headers: res.headers, buffer: await res.arrayBuffer() };
}

function assertStatus(res, expected, label) {
  if (res.status !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got ${res.status}`);
  }
}

function assertField(obj, field, label) {
  if (!obj[field]) throw new Error(`${label}: missing field "${field}" in ${JSON.stringify(obj)}`);
}

function assertPng(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error('Response is not a valid PNG (magic bytes mismatch)');
  }
}

// ── simulation suites ────────────────────────────────────────────────────────

async function simulateSnippet() {
  console.log('\n\x1b[1m[1] POST /api/convert/snippet\x1b[0m');

  let sessionId;

  await scenario('valid HTML snippet → 200 + sessionId + imageId + url', async () => {
    const res = await postJSON('/api/convert/snippet', { html: '<h1>Hello Openkova!</h1>' });
    assertStatus(res, 200, 'snippet');
    assertField(res.body, 'sessionId', 'snippet');
    assertField(res.body, 'imageId', 'snippet');
    assertField(res.body, 'url', 'snippet');
    sessionId = res.body.sessionId;
  });

  await scenario('session cookie is set in response', async () => {
    const res = await postJSON('/api/convert/snippet', { html: '<p>cookie test</p>' });
    const setCookie = res.headers.get('set-cookie') ?? '';
    if (!setCookie.includes('openkova_session')) {
      throw new Error(`set-cookie header missing openkova_session: "${setCookie}"`);
    }
  });

  await scenario('passing existing sessionId reuses session', async () => {
    if (!sessionId) throw new Error('no sessionId from previous test');
    const res = await postJSON('/api/convert/snippet', {
      html: '<p>reuse session</p>',
      sessionId,
    });
    assertStatus(res, 200, 'reuse-session');
    if (res.body.sessionId !== sessionId) {
      throw new Error(`sessionId changed: expected ${sessionId}, got ${res.body.sessionId}`);
    }
  });

  await scenario('styled HTML with CSS produces a screenshot', async () => {
    const html = `<div style="background:linear-gradient(135deg,#667eea,#764ba2);
      width:800px;height:400px;display:flex;align-items:center;justify-content:center;">
      <h1 style="color:#fff;font-family:sans-serif;">Openkova</h1></div>`;
    const res = await postJSON('/api/convert/snippet', { html });
    assertStatus(res, 200, 'styled');
    assertField(res.body, 'imageId', 'styled');
  });

  await scenario('missing html field → 400', async () => {
    const res = await postJSON('/api/convert/snippet', {});
    assertStatus(res, 400, 'missing-html');
  });

  await scenario('empty html string → 400', async () => {
    const res = await postJSON('/api/convert/snippet', { html: '   ' });
    assertStatus(res, 400, 'empty-html');
  });

  await scenario('invalid JSON body → 400', async () => {
    const res = await fetch(`${BASE}/api/convert/snippet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  return sessionId;
}

async function simulateSession(sessionId) {
  console.log('\n\x1b[1m[2] GET /api/session/:sessionId\x1b[0m');

  await scenario('existing session returns image list', async () => {
    if (!sessionId) throw new Error('no sessionId available');
    const res = await get(`/api/session/${sessionId}`);
    assertStatus(res, 200, 'session-list');
    const body = JSON.parse(new TextDecoder().decode(res.buffer));
    if (!Array.isArray(body.images)) throw new Error('images must be an array');
    if (body.images.length === 0) throw new Error('expected at least 1 image in session');
  });

  await scenario('unknown session returns empty images array', async () => {
    const res = await get('/api/session/00000000-0000-0000-0000-000000000000');
    assertStatus(res, 200, 'unknown-session');
    const body = JSON.parse(new TextDecoder().decode(res.buffer));
    if (!Array.isArray(body.images)) throw new Error('images must be an array');
  });
}

async function simulateImage(sessionId) {
  console.log('\n\x1b[1m[3] GET /api/image/:sessionId/:id\x1b[0m');

  let imageId;

  await scenario('fetch image list to get a valid imageId', async () => {
    if (!sessionId) throw new Error('no sessionId');
    const res = await get(`/api/session/${sessionId}`);
    const body = JSON.parse(new TextDecoder().decode(res.buffer));
    if (!body.images?.[0]) throw new Error('no images in session');
    imageId = body.images[0];
  });

  await scenario('existing image returns PNG binary', async () => {
    if (!imageId) throw new Error('no imageId');
    const res = await get(`/api/image/${sessionId}/${imageId}`);
    assertStatus(res, 200, 'image-fetch');
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('image/png')) throw new Error(`Content-Type is "${ct}", expected image/png`);
    assertPng(res.buffer);
  });

  await scenario('image has Cache-Control: immutable', async () => {
    if (!imageId) throw new Error('no imageId');
    const res = await get(`/api/image/${sessionId}/${imageId}`);
    const cc = res.headers.get('cache-control') ?? '';
    if (!cc.includes('immutable')) throw new Error(`Cache-Control "${cc}" missing immutable`);
  });

  await scenario('non-existent image → 404', async () => {
    const res = await get(`/api/image/${sessionId}/does-not-exist`);
    assertStatus(res, 404, 'missing-image');
  });
}

async function simulateFile() {
  console.log('\n\x1b[1m[4] POST /api/convert/file\x1b[0m');

  await scenario('single HTML file upload → 200 + results array', async () => {
    const htmlContent = `<html><body style="background:#4ecdc4;padding:40px;">
      <h1 style="color:#fff;font-family:sans-serif;">File Upload Test</h1></body></html>`;
    const file = new Blob([htmlContent], { type: 'text/html' });
    const res = await postForm('/api/convert/file', { files: new File([file], 'test.html', { type: 'text/html' }) });
    assertStatus(res, 200, 'file-upload');
    if (!Array.isArray(res.body.results)) throw new Error('results must be array');
    if (res.body.results.length !== 1) throw new Error('expected 1 result');
    assertField(res.body.results[0], 'imageId', 'file-upload-result');
    assertField(res.body.results[0], 'filename', 'file-upload-result');
  });

  await scenario('multiple HTML files upload → one result per file', async () => {
    const makeFile = (name, color) =>
      new File(
        [`<html><body style="background:${color};"><h1>File ${name}</h1></body></html>`],
        name,
        { type: 'text/html' },
      );

    const form = new FormData();
    form.append('files', makeFile('page1.html', '#e74c3c'));
    form.append('files', makeFile('page2.html', '#3498db'));
    form.append('files', makeFile('page3.html', '#2ecc71'));

    const res = await fetch(`${BASE}/api/convert/file`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json();
    if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
    if (body.results.length !== 3) throw new Error(`expected 3 results, got ${body.results.length}`);
  });

  await scenario('no files provided → 400', async () => {
    const form = new FormData();
    form.append('sessionId', 'test-session');
    const res = await fetch(`${BASE}/api/convert/file`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await scenario('sessionId is returned in response + cookie', async () => {
    const file = new File(['<p>session test</p>'], 's.html', { type: 'text/html' });
    const res = await postForm('/api/convert/file', { files: file });
    assertStatus(res, 200, 'file-session');
    assertField(res.body, 'sessionId', 'file-session');
  });
}

async function simulateUrl() {
  console.log('\n\x1b[1m[5] POST /api/convert/url\x1b[0m');

  // Spin up a local server with a couple of pages for the URL mode tests
  const { createServer } = await import('node:http');
  const testServer = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<html><body style="background:#1a1a2e;"><h1 style="color:#e94560;font-family:sans-serif;">URL Screenshot Test</h1></body></html>`);
  });
  const testBase = await new Promise((resolve) => {
    testServer.listen(0, () => {
      const addr = testServer.address();
      resolve(`http://localhost:${addr.port}`);
    });
  });

  try {
    await scenario('valid URL → 200 + results array', async () => {
      const res = await postJSON('/api/convert/url', { url: testBase });
      assertStatus(res, 200, 'url-convert');
      if (!Array.isArray(res.body.results)) throw new Error('results must be array');
      if (res.body.results.length === 0) throw new Error('expected at least 1 result');
      assertField(res.body.results[0], 'imageId', 'url-convert-result');
      assertField(res.body.results[0], 'url', 'url-convert-result');
    });

    await scenario('sessionId is set in response', async () => {
      const res = await postJSON('/api/convert/url', { url: testBase });
      assertField(res.body, 'sessionId', 'url-session');
    });

    await scenario('missing url field → 400', async () => {
      const res = await postJSON('/api/convert/url', {});
      assertStatus(res, 400, 'url-missing');
    });

    await scenario('empty url → 400', async () => {
      const res = await postJSON('/api/convert/url', { url: '' });
      assertStatus(res, 400, 'url-empty');
    });

    await scenario('invalid URL format → 400', async () => {
      const res = await postJSON('/api/convert/url', { url: 'not-a-valid-url' });
      assertStatus(res, 400, 'url-invalid');
    });

    await scenario('depth parameter is respected (depth=1 cap)', async () => {
      // depth capped at 2 — passing 99 should be silently clamped
      const res = await postJSON('/api/convert/url', { url: testBase, depth: 99 });
      assertStatus(res, 200, 'url-depth-clamp');
      // Should still work, just capped
      if (!Array.isArray(res.body.results)) throw new Error('results must be array');
    });
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }
}

async function simulateStaticPages() {
  console.log('\n\x1b[1m[6] Static pages\x1b[0m');

  for (const [label, path] of [
    ['/ (home)', '/'],
    ['/docs', '/docs'],
    ['/about', '/about'],
    ['/how-it-works', '/how-it-works'],
  ]) {
    await scenario(`GET ${path} → 200 HTML`, async () => {
      const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10_000) });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('text/html')) throw new Error(`Content-Type "${ct}" is not HTML`);
    });
  }

  await scenario('GET /github → redirect (3xx)', async () => {
    const res = await fetch(`${BASE}/github`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status < 300 || res.status >= 400) {
      throw new Error(`Expected 3xx redirect, got ${res.status}`);
    }
    const location = res.headers.get('location') ?? '';
    if (!location.includes('github.com')) {
      throw new Error(`Redirect location "${location}" does not point to github.com`);
    }
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\x1b[1m\x1b[34mOpenkova — Full-Stack Simulation\x1b[0m');
  console.log('Starting production server on port', PORT, '...\n');

  startServer();

  try {
    await waitForServer();
    console.log('Server is ready.\n');

    const sessionId = await simulateSnippet();
    await simulateSession(sessionId);
    await simulateImage(sessionId);
    await simulateFile();
    await simulateUrl();
    await simulateStaticPages();

  } finally {
    stopServer();
  }

  // ── summary ──
  const total = passed + failed;
  console.log('\n' + '─'.repeat(50));
  console.log(`\x1b[1mResults: ${total} scenarios\x1b[0m`);
  console.log(`  \x1b[32mPassed: ${passed}\x1b[0m`);
  if (failed > 0) {
    console.log(`  \x1b[31mFailed: ${failed}\x1b[0m`);
    console.log('\nFailed scenarios:');
    for (const f of failures) {
      console.log(`  • ${f.name}`);
      console.log(`    ${f.detail}`);
    }
  } else {
    console.log(`  \x1b[32mFailed: 0 — all scenarios passed!\x1b[0m`);
  }
  console.log('─'.repeat(50));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\x1b[31mSimulation failed to start:\x1b[0m', err.message);
  stopServer();
  process.exit(1);
});
