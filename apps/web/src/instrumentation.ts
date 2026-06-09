export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { LocalStorageAdapter, closeBrowser } = await import('@openkova/core');
    const storage = new LocalStorageAdapter();

    const STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
    const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

    const runCleanup = () =>
      storage
        .cleanup(STORAGE_MAX_AGE_MS)
        .then((n) => { if (n > 0) console.log(`[cleanup] Removed ${n} expired session(s)`); })
        .catch((err) => console.error('[cleanup] Error:', err));

    void runCleanup();
    setInterval(runCleanup, CLEANUP_INTERVAL_MS);

    // Graceful shutdown — close the shared Chromium instance before the
    // process exits so it doesn't leave orphan Chrome processes behind.
    const shutdown = () => { void closeBrowser(); };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }
}
