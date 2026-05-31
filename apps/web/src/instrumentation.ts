import chromium from '@sparticuz/chromium';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  // Pre-extract the Chrome binary at Lambda init time so the first conversion
  // request doesn't pay the decompression cost on every cold start.
  process.env.CHROMIUM_PATH = await chromium.executablePath();
}
