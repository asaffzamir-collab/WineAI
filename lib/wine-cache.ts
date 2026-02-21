/**
 * Wine cache layer — checks the Supabase `wines` table before calling OpenAI.
 *
 * Provides DB-first lookups and upserts so repeated searches for the same wine
 * skip the AI entirely and return cached data.
 *
 * Also provides a negative-cache for image lookups: when all external sources
 * fail, we remember that for 24 h so we don't keep hammering them.
 */

import type { WineData } from '@/lib/openai';
import { createClient } from '@/lib/supabase/server';

// ───────────── Negative image cache (in-memory, 24 h TTL) ─────────────

const NEGATIVE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const negativeImageCache = new Map<string, number>();

function negativeKey(name: string, winery: string): string {
  return `${name}|||${winery}`.toLowerCase();
}

/** Returns true if this wine recently failed image lookup. */
export function isNegativelyCached(name: string, winery: string): boolean {
  const key = negativeKey(name, winery);
  const ts = negativeImageCache.get(key);
  if (!ts) return false;
  if (Date.now() - ts > NEGATIVE_TTL_MS) {
    negativeImageCache.delete(key);
    return false;
  }
  return true;
}

/** Mark a wine as having no image available (temporarily). */
export function cacheNegativeResult(name: string, winery: string): void {
  const key = negativeKey(name, winery);
  negativeImageCache.set(key, Date.now());

  // Evict stale entries periodically to prevent unbounded growth
  if (negativeImageCache.size > 2000) {
    const now = Date.now();
    negativeImageCache.forEach((v, k) => {
      if (now - v > NEGATIVE_TTL_MS) negativeImageCache.delete(k);
    });
  }
}

interface WineRow {
  id: string;
  name: string;
  winery: string;
  vivino_rating: number | null;
  vivino_reviews: number | null;
  country: string | null;
  region: string | null;
  grapes: string[] | null;
  alcohol: number | null;
  wine_type: string | null;
  tasting_notes: Record<string, unknown> | null;
  ai_description: string | null;
  image_url: string | null;
  serving: Record<string, unknown> | null;
  food_pairings: string[] | null;
  taste_spectrum: { body: number; tannin: number; sweetness: number; acidity: number } | null;
}

function rowToWineData(row: WineRow): WineData {
  return {
    name: row.name,
    winery: row.winery,
    vivino_rating: row.vivino_rating ?? undefined,
    vivino_reviews: row.vivino_reviews ?? undefined,
    country: row.country ?? '',
    region: row.region ?? undefined,
    grapes: row.grapes ?? [],
    alcohol: row.alcohol ?? undefined,
    wine_type: (row.wine_type as WineData['wine_type']) ?? 'red',
    tasting_notes: row.tasting_notes as WineData['tasting_notes'],
    image_url: row.image_url ?? undefined,
    serving: row.serving as WineData['serving'],
    food_pairings: row.food_pairings ?? undefined,
    taste_spectrum: row.taste_spectrum ?? undefined,
  };
}

const WINE_SELECT = `
  id, name, winery, vivino_rating, vivino_reviews,
  country, region, grapes, alcohol, wine_type,
  tasting_notes, ai_description, image_url, serving, food_pairings, taste_spectrum
`;

/**
 * Look up cached wines by a text query. Performs a case-insensitive search
 * against name and winery columns. Returns matching wines or an empty array.
 */
export async function findCachedWines(query: string): Promise<WineData[]> {
  try {
    const supabase = await createClient();
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const { data, error } = await supabase
      .from('wines')
      .select(WINE_SELECT)
      .or(`name.ilike.%${normalized}%,winery.ilike.%${normalized}%`)
      .limit(5);

    if (error || !data || data.length === 0) return [];
    return (data as WineRow[]).map(rowToWineData);
  } catch {
    return [];
  }
}

/**
 * Look up a single cached wine by exact name + winery.
 */
export async function findCachedWine(
  name: string,
  winery: string,
): Promise<WineData | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('wines')
      .select(WINE_SELECT)
      .eq('name', name)
      .eq('winery', winery)
      .single();

    if (error || !data) return null;
    return rowToWineData(data as WineRow);
  } catch {
    return null;
  }
}

/**
 * Look up the cached image_url for a wine by name + winery.
 * Returns the URL if stored, or null.
 */
export async function findCachedImageUrl(
  name: string,
  winery: string,
): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('wines')
      .select('image_url')
      .eq('name', name)
      .eq('winery', winery)
      .not('image_url', 'is', null)
      .limit(1)
      .single();

    if (error || !data) return null;
    return (data as { image_url: string | null }).image_url;
  } catch {
    return null;
  }
}

/**
 * Persist a wine's image_url to the DB so future requests skip external APIs.
 */
export async function cacheImageUrl(
  name: string,
  winery: string,
  imageUrl: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('wines')
      .update({ image_url: imageUrl })
      .eq('name', name)
      .eq('winery', winery)
      .is('image_url', null);
  } catch {
    // best-effort
  }
}

/**
 * Clear a stale/broken image_url from the DB so the next request re-fetches.
 */
export async function clearCachedImageUrl(
  name: string,
  winery: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('wines')
      .update({ image_url: null })
      .eq('name', name)
      .eq('winery', winery);
  } catch {
    // best-effort
  }
}

/**
 * Persist a wine's taste_spectrum to the DB so future lookups return consistent values.
 */
export async function cacheTasteSpectrum(
  name: string,
  winery: string,
  tasteSpectrum: { body: number; tannin: number; sweetness: number; acidity: number },
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('wines')
      .update({ taste_spectrum: tasteSpectrum })
      .eq('name', name)
      .eq('winery', winery)
      .is('taste_spectrum', null);
  } catch {
    // best-effort
  }
}
