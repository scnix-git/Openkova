/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@openkova/core',
      '@sparticuz/chromium',
      'puppeteer',
      'puppeteer-core',
      '@puppeteer/browsers',
      'ws',
      'bufferutil',
      'utf-8-validate',
    ],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      const existingExternals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          const nativePackages = [
            '@sparticuz/chromium',
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
