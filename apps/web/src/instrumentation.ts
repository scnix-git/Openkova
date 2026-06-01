export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { LocalStorageAdapter } = await import('@openkova/core');
    const storage = new LocalStorageAdapter();
    const MAX_AGE_MS = 24 * 60 * 60 * 1000;

    const runCleanup = () =>
      storage
        .cleanup(MAX_AGE_MS)
        .then((n) => { if (n > 0) console.log(`[cleanup] Removed ${n} expired session(s)`); })
        .catch((err) => console.error('[cleanup] Error:', err));

    void runCleanup();
    setInterval(runCleanup, 60 * 60 * 1000);
  }
}
