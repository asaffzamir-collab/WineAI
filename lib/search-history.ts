/**
 * Client-side: last 20 search results per user, persisted in localStorage.
 * Same shape as wine search result for display and re-fetch.
 */

import type { WineData } from '@/lib/openai';

const STORAGE_KEY_PREFIX = 'wineSearchHistory_';
const MAX_RECENT = 20;

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/** Ensure a stored item has the minimum shape WineData expects (avoids crashes from old/corrupt data). */
function normalizeStoredWine(raw: unknown): WineData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name : '';
  const winery = typeof o.winery === 'string' ? o.winery : '';
  if (!name && !winery) return null;
  const grapes = Array.isArray(o.grapes) ? o.grapes.map(String) : [];
  const wineType = ['red', 'white', 'rose', 'sparkling', 'dessert'].includes(String(o.wine_type))
    ? (o.wine_type as WineData['wine_type'])
    : 'red';
  return {
    name,
    winery,
    country: typeof o.country === 'string' ? o.country : '',
    grapes,
    wine_type: wineType,
    ...(typeof o.vintage === 'number' && { vintage: o.vintage }),
    ...(typeof o.vivino_rating === 'number' && { vivino_rating: o.vivino_rating }),
    ...(typeof o.vivino_reviews === 'number' && { vivino_reviews: o.vivino_reviews }),
    ...(typeof o.region === 'string' && { region: o.region }),
    ...(typeof o.alcohol === 'number' && { alcohol: o.alcohol }),
    ...(typeof o.body === 'string' && { body: o.body as WineData['body'] }),
    ...(typeof o.sweetness === 'string' && { sweetness: o.sweetness as WineData['sweetness'] }),
    ...(o.tasting_notes && typeof o.tasting_notes === 'object' ? { tasting_notes: o.tasting_notes as WineData['tasting_notes'] } : {}),
    ...(typeof o.winery_description === 'string' && { winery_description: o.winery_description }),
    ...(typeof o.image_url === 'string' && { image_url: o.image_url }),
    ...(Array.isArray(o.food_pairings) && { food_pairings: o.food_pairings.map(String) }),
    ...(typeof o.price_range_usd === 'string' && { price_range_usd: o.price_range_usd }),
    ...(o.serving && typeof o.serving === 'object' ? { serving: o.serving as WineData['serving'] } : {}),
  };
}

export function getRecentSearches(userId: string): WineData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoredWine).filter((w): w is WineData => w !== null);
  } catch {
    return [];
  }
}

function dedupeKey(w: WineData): string {
  return `${String(w.name).trim()}|${String(w.winery).trim()}`;
}

/** Add a wine to recent searches (prepend, dedupe by name+winery, keep last MAX_RECENT). */
export function addRecentSearch(userId: string, wine: WineData): void {
  if (typeof window === 'undefined') return;
  const key = dedupeKey(wine);
  let list = getRecentSearches(userId).filter((w) => dedupeKey(w) !== key);
  list = [wine, ...list].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list));
  } catch {
    // quota or disabled
  }
}
