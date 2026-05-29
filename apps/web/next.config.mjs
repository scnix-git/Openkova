/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core', '@puppeteer/browsers'],
  },
};

export default nextConfig;
