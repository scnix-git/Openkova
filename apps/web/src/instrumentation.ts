export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;
  // Importing here forces Next.js file tracer to include @sparticuz/chromium's
  // Brotli-compressed Chrome binary in the serverless function deployment.
  // The renderer (in @openkova/core) performs the same import at request time.
  await import('@sparticuz/chromium');
}
