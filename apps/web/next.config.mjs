/** @type {import('next').NextConfig} */
const nextConfig = {
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
  outputFileTracingIncludes: {
    '/api/convert/snippet': ['./node_modules/@sparticuz/chromium/**/*'],
    '/api/convert/file': ['./node_modules/@sparticuz/chromium/**/*'],
    '/api/convert/url': ['./node_modules/@sparticuz/chromium/**/*'],
  },
};

export default nextConfig;
