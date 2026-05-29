import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { crawlUrl } from '../crawler.js';

// ---------- mock HTTP server ----------
let server: http.Server;
let base: string;

const PAGES: Record<string, string> = {
  '/': `<html><body>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
    <a href="/about">About again (dup)</a>
    <a href="https://external.com/page">External</a>
    <a href="javascript:void(0)">JS link</a>
    <a href="mailto:hi@example.com">Mail link</a>
    <a href="#section">Fragment only</a>
    <a href="/docs?ref=nav">With query</a>
  </body></html>`,
  '/about': `<html><body><a href="/">Home</a><a href="/team">Team</a></body></html>`,
  '/contact': `<html><body><p>Contact us</p></body></html>`,
  '/docs': `<html><body><p>Docs</p></body></html>`,
};

before(
  () =>
    new Promise<void>((resolve) => {
      server = http.createServer((req, res) => {
        const path = req.url?.split('?')[0] ?? '/';
        const body = PAGES[path];
        if (body) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(body);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
      server.listen(0, () => {
        const addr = server.address() as { port: number };
        base = `http://localhost:${addr.port}`;
        resolve();
      });
    }),
);

after(
  () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
);
// --------------------------------------

describe('crawlUrl — basic extraction', () => {
  test('always includes the root URL', async () => {
    const urls = await crawlUrl(`${base}/`);
    assert.ok(urls.includes(`${base}/`), 'root URL must be in results');
  });

  test('extracts /about and /contact from root page', async () => {
    const urls = await crawlUrl(`${base}/`);
    const paths = urls.map((u) => new URL(u).pathname);
    assert.ok(paths.includes('/about'), 'missing /about');
    assert.ok(paths.includes('/contact'), 'missing /contact');
  });

  test('query-string URLs are included', async () => {
    const urls = await crawlUrl(`${base}/`);
    assert.ok(urls.some((u) => u.includes('/docs')), 'missing /docs?ref=nav');
  });
});

describe('crawlUrl — filtering', () => {
  test('excludes external-origin links', async () => {
    const urls = await crawlUrl(`${base}/`);
    assert.ok(
      !urls.some((u) => u.includes('external.com')),
      'external.com must not appear',
    );
  });

  test('excludes javascript: hrefs', async () => {
    const urls = await crawlUrl(`${base}/`);
    assert.ok(
      !urls.some((u) => u.startsWith('javascript:')),
      'javascript: link must not appear',
    );
  });

  test('excludes mailto: hrefs', async () => {
    const urls = await crawlUrl(`${base}/`);
    assert.ok(
      !urls.some((u) => u.startsWith('mailto:')),
      'mailto: link must not appear',
    );
  });
});

describe('crawlUrl — deduplication', () => {
  test('duplicate href values produce only one entry', async () => {
    const urls = await crawlUrl(`${base}/`);
    const uniq = [...new Set(urls)];
    assert.equal(urls.length, uniq.length, 'found duplicate URLs in result');
  });

  test('fragment-only href is normalised away (same URL not duplicated)', async () => {
    const urls = await crawlUrl(`${base}/`);
    const rootCount = urls.filter((u) => {
      const parsed = new URL(u);
      parsed.hash = '';
      return parsed.toString() === `${base}/`;
    }).length;
    assert.equal(rootCount, 1, 'root URL should appear exactly once');
  });
});

describe('crawlUrl — depth control', () => {
  test('depth=0 returns only the root URL', async () => {
    const urls = await crawlUrl(`${base}/`, 0);
    assert.equal(urls.length, 1);
    assert.equal(urls[0], `${base}/`);
  });

  test('depth=1 (default) returns root + directly linked pages', async () => {
    const urls = await crawlUrl(`${base}/`);
    assert.ok(urls.length > 1, 'should include more than just root');
  });
});

describe('crawlUrl — error resilience', () => {
  test('unreachable host returns at least the root URL without throwing', async () => {
    const urls = await crawlUrl('http://localhost:1/');
    assert.ok(Array.isArray(urls), 'must return array');
    // Root URL is added before the fetch attempt
    assert.ok(urls.length >= 1, 'must contain at least root URL');
  });

  test('malformed HTML (no links) returns only root URL', async () => {
    const noLinksServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><p>No links here at all.</p></body></html>');
    });
    const noLinksBase: string = await new Promise((resolve) => {
      noLinksServer.listen(0, () => {
        const addr = noLinksServer.address() as { port: number };
        resolve(`http://localhost:${addr.port}`);
      });
    });

    const urls = await crawlUrl(`${noLinksBase}/`);
    assert.equal(urls.length, 1);

    await new Promise<void>((resolve) => noLinksServer.close(() => resolve()));
  });
});
