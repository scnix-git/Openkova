const LINK_REGEX = /<a\s[^>]*href=["']([^"']+)["']/gi;
const FETCH_TIMEOUT = 10_000;

// Block requests to private/loopback ranges to prevent SSRF.
// Does not prevent DNS-rebinding; ::ffff: mapped IPv4 variants are covered.
const PRIVATE_HOST_RE = /^(localhost|.*\.local)$/i;
const PRIVATE_IP_RE =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|::1$|fc[\da-f]{2}:|fe80:|::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.))/i;

/** Maximum number of URLs returned by {@link crawlUrl}. */
export const MAX_CRAWL_URLS = 200;

export function isSafeHost(hostname: string): boolean {
  return !PRIVATE_HOST_RE.test(hostname) && !PRIVATE_IP_RE.test(hostname);
}

/**
 * Fetch `rootUrl`, extract all same-origin `<a href>` links, and return the
 * full list of URLs to capture (root first). Results are capped at
 * {@link MAX_CRAWL_URLS}.
 *
 * @param rootUrl    The starting URL. Must be http/https on a public host.
 * @param depth      1 = root + its direct links (default). Max 2.
 * @param onProgress Optional callback for progress messages.
 */
export async function crawlUrl(
  rootUrl: string,
  depth = 1,
  onProgress?: (msg: string) => void,
): Promise<string[]> {
  const parsed = new URL(rootUrl);
  if (!isSafeHost(parsed.hostname)) {
    throw new Error(`Crawling private/internal hosts is not allowed: ${parsed.hostname}`);
  }

  const origin = parsed.origin;
  const seen = new Set<string>();
  seen.add(normalizeUrl(rootUrl));

  const results: string[] = [rootUrl];

  if (depth < 1) return results;

  onProgress?.(`Fetching ${rootUrl}`);
  let html: string;
  try {
    const res = await fetch(rootUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    html = await res.text();
  } catch {
    return results;
  }

  const allFirstLevel = extractSameOriginLinks(html, rootUrl, origin, seen);
  // root already occupies slot 0 — cap first-level links accordingly
  const firstLevel = allFirstLevel.slice(0, MAX_CRAWL_URLS - 1);
  results.push(...firstLevel);

  if (depth >= 2 && firstLevel.length > 0) {
    onProgress?.(`Following ${firstLevel.length} link${firstLevel.length !== 1 ? 's' : ''}…`);
    for (const link of firstLevel) {
      if (results.length >= MAX_CRAWL_URLS) break;
      try {
        const res = await fetch(link, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        const subHtml = await res.text();
        const subLinks = extractSameOriginLinks(subHtml, link, origin, seen);
        for (const sub of subLinks) {
          if (results.length >= MAX_CRAWL_URLS) break;
          results.push(sub);
        }
      } catch {
        // skip unreachable pages
      }
    }
  }

  const total = results.length;
  const limitNote = total >= MAX_CRAWL_URLS ? ` (capped at ${MAX_CRAWL_URLS})` : '';
  onProgress?.(`Found ${total} page${total !== 1 ? 's' : ''}${limitNote} to capture`);

  return results;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    return u.toString();
  } catch {
    return url;
  }
}

function extractSameOriginLinks(
  html: string,
  base: string,
  origin: string,
  seen: Set<string>,
): string[] {
  const links: string[] = [];
  let match: RegExpExecArray | null;

  LINK_REGEX.lastIndex = 0;
  while ((match = LINK_REGEX.exec(html)) !== null) {
    const href = match[1];
    if (!href) continue;

    if (/^[a-z]+:/i.test(href) && !href.startsWith('http') && !href.startsWith('/')) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }

    if (resolved.origin !== origin) continue;
    if (!isSafeHost(resolved.hostname)) continue;

    const normalized = normalizeUrl(resolved.toString());
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(resolved.toString());
  }

  return links;
}
