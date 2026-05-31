// Side-effect module: must be imported before @sparticuz/chromium.
// @sparticuz/chromium's module-level code calls setupLambdaEnvironment() only
// when AWS_EXECUTION_ENV contains "20.x" or "22.x". On Vercel nodejs24.x,
// Lambda sets it to "AWS_Lambda_nodejs24.x", which the library doesn't match,
// so al2023.tar.br is never extracted and LD_LIBRARY_PATH is never set.
// Override to "22.x" (AL2023, same underlying OS) before the package loads.
if (typeof process !== 'undefined') {
  if (!/nodejs(20|22)\.x/.test(process.env.AWS_EXECUTION_ENV ?? '')) {
    process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs22.x';
  }
}
