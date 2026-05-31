// Import order matters: chromium-env.ts must run before @sparticuz/chromium
// is required so the module-level environment setup runs correctly.
import './lib/chromium-env';
import chromium from '@sparticuz/chromium';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  // Pre-extract the Chrome binary at Lambda init time so the first conversion
  // request doesn't pay the 1-2 s decompression cost on every cold start.
  process.env.CHROMIUM_PATH = await chromium.executablePath();
}
