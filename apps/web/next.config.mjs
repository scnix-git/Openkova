/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@openkova/core', 'puppeteer-core', 'puppeteer'],
};

export default nextConfig;
