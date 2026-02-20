/**
 * Distributed rate limiter using Upstash Redis.
 *
 * Uses a sliding-window algorithm that works across all Vercel edge/serverless
 * instances. Falls back to a simple in-memory limiter when Upstash env vars
 * are not configured (local development).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstash =
  typeof process.env.UPSTASH_REDIS_REST_URL === 'string' &&
  process.env.UPSTASH_REDIS_REST_URL.length > 0 &&
  typeof process.env.UPSTASH_REDIS_REST_TOKEN === 'string' &&
  process.env.UPSTASH_REDIS_REST_TOKEN.length > 0;

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: true,
      prefix: 'wj-rl',
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// --------------- In-memory fallback for local dev ---------------

interface MemEntry { count: number; resetAt: number }
const memStore = new Map<string, MemEntry>();
let lastCleanup = Date.now();

function memCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  memStore.forEach((entry, k) => { if (now > entry.resetAt) memStore.delete(k); });
}

function memRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { limited: boolean; retryAfterMs: number } {
  memCleanup();
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterMs: 0 };
  }
  entry.count++;
  if (entry.count > limit) {
    return { limited: true, retryAfterMs: entry.resetAt - now };
  }
  return { limited: false, retryAfterMs: 0 };
}

// --------------- Public API (same signature as before) ---------------

/**
 * Check whether the given key has exceeded the limit within the window.
 * Returns { limited: false } if OK, or { limited: true, retryAfterMs } if blocked.
 */
export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<{ limited: boolean; retryAfterMs: number }> {
  if (!hasUpstash) {
    return memRateLimit(key, { limit, windowMs });
  }

  try {
    const limiter = getLimiter(limit, windowMs);
    const { success, reset } = await limiter.limit(key);
    if (success) {
      return { limited: false, retryAfterMs: 0 };
    }
    return { limited: true, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch (err) {
    console.warn('Upstash rate-limit check failed, allowing request:', err);
    return { limited: false, retryAfterMs: 0 };
  }
}
