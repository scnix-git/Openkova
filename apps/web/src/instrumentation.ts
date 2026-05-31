export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  // @sparticuz/chromium detects the Lambda OS by checking AWS_EXECUTION_ENV
  // for "nodejs20.x" or "nodejs22.x". Vercel nodejs24.x doesn't set this var,
  // so the package skips extracting al2023.tar.br and setting LD_LIBRARY_PATH,
  // which causes Chrome to crash on start (FUNCTION_INVOCATION_FAILED).
  // Setting this before the first import makes the module-level setup code
  // treat the runtime as AL2023 (same underlying OS as nodejs22.x).
  process.env.AWS_EXECUTION_ENV ??= 'AWS_Lambda_nodejs22.x';

  // Importing here also forces Next.js file tracer to include the package's
  // Brotli-compressed Chrome binary in the serverless function bundle.
  await import('@sparticuz/chromium');
}
