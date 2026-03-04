import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks on secret values.
 * Returns false if either string is empty.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
