export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  // Dynamic import avoids Turbopack bundling @sparticuz/chromium, which would
  // break its internal ./bin path resolution. outputFileTracingIncludes in
  // next.config.mjs ensures the binary files are still included in the bundle.
  const { default: chromium } = await import('@sparticuz/chromium');
  process.env.CHROMIUM_PATH = await chromium.executablePath();
}
