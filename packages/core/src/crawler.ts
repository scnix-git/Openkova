const LINK_REGEX = /<a\s[^>]*href=["']([^"']+)["']/gi;
const FETCH_TIMEOUT = 10_000;

// Block requests to private/loopback ranges to prevent SSRF.
// Does not prevent DNS-rebinding.
const PRIVATE_HOST_RE = /^(localhost|.*\.local)$/i;
const PRIVATE_IP_RE =
  /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|::1$|fc[\da-f]{2}:|fe80:)/i;

// URL.hostname normalises ::ffff:a.b.c.d to two hex groups (e.g. ::ffff:c0a8:101).
// Capture them so we can convert back to dotted-decimal for PRIVATE_IP_RE.
const IPV4_MAPPED_HEX_RE = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;
// Fallback: dotted-decimal form passed directly (not via URL.hostname).
const IPV4_MAPPED_DOT_RE = /^::ffff:([\d.]+)$/i;

/** Maximum number of URLs returned by {@link crawlUrl}. */
export const MAX_CRAWL_URLS = 200;

export function isSafeHost(hostname: string): boolean {
  // URL.hostname wraps IPv6 addresses in brackets — strip them for matching.
  const host =
    hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;

  // IPv4-mapped IPv6 in hex-group notation (from URL.hostname normalisation).
  const hexMapped = IPV4_MAPPED_HEX_RE.exec(host);
  if (hexMapped) {
    const hi = parseInt(hexMapped[1]!, 16);
    const lo = parseInt(hexMapped[2]!, 16);
    const dotted = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
    return !PRIVATE_IP_RE.test(dotted);
  }

  // IPv4-mapped IPv6 in dotted-decimal notation (e.g. passed directly to this function).
  const dotMapped = IPV4_MAPPED_DOT_RE.exec(host);
  if (dotMapped) {
    return !PRIVATE_IP_RE.test(dotMapped[1]!);
  }

  return !PRIVATE_HOST_RE.test(host) && !PRIVATE_IP_RE.test(host);
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
    throw new Error(`@openkova/core: Crawling private/internal hosts is not allowed: ${parsed.hostname}`);
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

  // Only enter depth-2 discovery if there is still room below the cap.
  if (depth >= 2 && firstLevel.length > 0 && results.length < MAX_CRAWL_URLS) {
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
