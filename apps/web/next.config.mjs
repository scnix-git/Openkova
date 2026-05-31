import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow file tracing to reach the monorepo root so pnpm's .pnpm directory
  // (which contains the real @sparticuz/chromium bin files) is included.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  serverExternalPackages: [
    '@openkova/core',
    '@sparticuz/chromium',
    'tar-fs',
    'puppeteer',
    'puppeteer-core',
    '@puppeteer/browsers',
    'ws',
    'bufferutil',
    'utf-8-validate',
  ],
  // Paths are relative to the Next.js project dir (apps/web/).
  // Use the real pnpm store path so the chromium bin files are deployed.
  outputFileTracingIncludes: {
    '/api/convert/snippet': [
      '../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*',
    ],
    '/api/convert/file': [
      '../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*',
    ],
    '/api/convert/url': [
      '../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/**/*',
    ],
  },
};

export default nextConfig;
