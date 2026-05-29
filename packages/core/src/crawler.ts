const LINK_REGEX = /<a\s[^>]*href=["']([^"']+)["']/gi;
const FETCH_TIMEOUT = 10_000;

export async function crawlUrl(rootUrl: string, depth = 1): Promise<string[]> {
  const origin = new URL(rootUrl).origin;
  const seen = new Set<string>();
  seen.add(normalizeUrl(rootUrl));

  const results: string[] = [rootUrl];

  if (depth < 1) return results;

  let html: string;
  try {
    const res = await fetch(rootUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    html = await res.text();
  } catch {
    return results;
  }

  const links = extractSameOriginLinks(html, rootUrl, origin, seen);
  results.push(...links);

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

    // Skip javascript: and mailto: etc.
    if (/^[a-z]+:/i.test(href) && !href.startsWith('http') && !href.startsWith('/')) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }

    if (resolved.origin !== origin) continue;

    const normalized = normalizeUrl(resolved.toString());
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(resolved.toString());
  }

  return links;
}
