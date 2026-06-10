import fs from 'node:fs/promises';
import path from 'node:path';

export function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = [u.hostname, ...u.pathname.split('/').filter(Boolean)];
    return parts.join('-').replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
  } catch {
    return 'screenshot';
  }
}

export function extFromImageId(imageId: string): string {
  return imageId.split('.').pop() ?? 'png';
}

export async function uniqueFilename(dir: string, base: string, ext: string): Promise<string> {
  let name = `${base}.${ext}`;
  let counter = 1;
  while (true) {
    try {
      await fs.access(path.join(dir, name));
      name = `${base}-${counter}.${ext}`;
      counter++;
    } catch {
      return name;
    }
  }
}
