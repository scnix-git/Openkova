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
  webpack(config, { isServer }) {
    if (isServer) {
      const existingExternals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          const nativePackages = [
            '@sparticuz/chromium',
            'tar-fs',
            'bufferutil',
            'utf-8-validate',
            'ws',
            'puppeteer',
            'puppeteer-core',
            '@puppeteer/browsers',
          ];
          if (nativePackages.some((p) => request === p || request.startsWith(p + '/'))) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
