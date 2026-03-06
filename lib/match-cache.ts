import type { WineData, ProfileMatchResult } from '@/lib/openai';

const STORAGE_KEY_PREFIX = 'wineMatchCache_';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  match: ProfileMatchResult;
  ts: number;
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function wineKey(wine: WineData): string {
  return `${String(wine.name).trim()}|${String(wine.winery).trim()}`;
}

function readMap(userId: string): Record<string, CacheEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function writeMap(userId: string, map: Record<string, CacheEntry>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    // quota or disabled
  }
}

export function getCachedMatch(userId: string, wine: WineData): ProfileMatchResult | null {
  const map = readMap(userId);
  const key = wineKey(wine);
  const entry = map[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > MAX_AGE_MS) return null;
  if (!entry.match.explanation) {
    delete map[key];
    writeMap(userId, map);
    return null;
  }
  return entry.match;
}

export function setCachedMatch(userId: string, wine: WineData, match: ProfileMatchResult): void {
  if (!match.explanation) return;
  const map = readMap(userId);
  map[wineKey(wine)] = { match, ts: Date.now() };
  writeMap(userId, map);
}

export function clearMatchCache(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Invalidate both client (localStorage) and server (DB) match caches,
 * then dispatch the wine-profile-updated event.
 */
export function invalidateAllMatchCaches(userId: string): void {
  clearMatchCache(userId);
  fetch('/api/wine-match/invalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  }).catch(() => {});
  window.dispatchEvent(new Event('wine-profile-updated'));
}
