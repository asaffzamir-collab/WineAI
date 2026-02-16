/**
 * Simple in-memory rate limiter for Vercel Edge Runtime.
 *
 * Edge functions are long-lived within a region, so a Map effectively
 * rate-limits requests hitting the same edge instance. This won't
 * synchronise across regions, but it catches the most common abuse
 * pattern (rapid sequential requests from one client).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000; // purge expired entries every 60 s
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

/**
 * Check whether the given key has exceeded the limit within the window.
 * Returns { limited: false } if OK, or { limited: true, retryAfterMs } if blocked.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { limited: boolean; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > limit) {
    return { limited: true, retryAfterMs: entry.resetAt - now };
  }

  return { limited: false, retryAfterMs: 0 };
}
