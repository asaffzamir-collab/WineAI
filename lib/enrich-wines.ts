/**
 * Shared wine enrichment utility.
 *
 * Consolidates the duplicated enrichment pipeline used across
 * sommelier chat (search_wine, recommend_wines), discover-wines,
 * and food pairing routes into a single reusable function.
 */

import type { WineData, TasteSpectrum } from '@/lib/openai';
import { findCachedWines } from '@/lib/wine-cache';

export interface MinimalWine {
  name: string;
  winery: string;
  region?: string;
  grape?: string;
  grapes?: string[];
  wine_type?: string;
  country?: string;
  reason?: string;
  tasting_note?: string;
  food_pairings?: string[];
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: TasteSpectrum;
  profile_spectrum?: TasteSpectrum;
  image_url?: string;
  match?: number;
}

export interface EnrichedWine {
  name: string;
  winery: string;
  region?: string;
  grape?: string;
  wine_type?: string;
  country?: string;
  match?: number;
  reason?: string;
  tasting_note?: string;
  image_url?: string;
  food_pairings?: string[];
  alcohol?: string;
  vivino_rating?: number;
  vivino_reviews?: number;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
  serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: TasteSpectrum;
  profile_spectrum?: TasteSpectrum;
  why_drink_it?: string;
  similar_wines_note?: string;
}

export interface EnrichOptions {
  language?: string;
  /** Max wines to call full matchWineToProfile on. Default: all wines. */
  maxFullMatch?: number;
  /** Skip searchWinesByText if the wine already has these fields. */
  skipSearchWhenComplete?: boolean;
}

type TypedProfiles = Record<string, unknown>;

function profileKeyForWine(wineType: string): string {
  if (wineType === 'sparkling' || wineType === 'dessert') return 'white';
  return wineType || 'red';
}

function applySpectrum(target: EnrichedWine, raw: { wine_spectrum?: TasteSpectrum; profile_spectrum?: TasteSpectrum }): void {
  if (raw.wine_spectrum) {
    target.wine_spectrum = {
      body: raw.wine_spectrum.body,
      tannin: raw.wine_spectrum.tannin,
      sweetness: raw.wine_spectrum.sweetness,
      acidity: raw.wine_spectrum.acidity,
    };
  }
  if (raw.profile_spectrum) {
    target.profile_spectrum = {
      body: raw.profile_spectrum.body,
      tannin: raw.profile_spectrum.tannin,
      sweetness: raw.profile_spectrum.sweetness,
      acidity: raw.profile_spectrum.acidity,
    };
  }
}

function applyMatchResult(
  target: EnrichedWine,
  raw: { match_percentage?: number; explanation?: string; positive_matches?: string[]; mismatches?: string[]; why_drink_it?: string; similar_wines_note?: string; wine_spectrum?: TasteSpectrum; profile_spectrum?: TasteSpectrum },
): void {
  target.match = raw.match_percentage;
  if (raw.explanation) target.reason = raw.explanation;
  target.positive_matches = raw.positive_matches;
  target.mismatches = raw.mismatches;
  target.why_drink_it = raw.why_drink_it;
  target.similar_wines_note = raw.similar_wines_note;
  applySpectrum(target, raw);
}

function applyFullWineData(target: EnrichedWine, fullWine: WineData): void {
  if (fullWine.vivino_rating) target.vivino_rating = fullWine.vivino_rating;
  if (fullWine.vivino_reviews) target.vivino_reviews = fullWine.vivino_reviews;
  if (fullWine.alcohol != null) target.alcohol = String(fullWine.alcohol);
  if (fullWine.image_url) target.image_url = fullWine.image_url;
  if (fullWine.tasting_notes) target.tasting_notes = fullWine.tasting_notes as EnrichedWine['tasting_notes'];
  if (fullWine.serving) {
    target.serving = {
      drink_from: fullWine.serving.drink_from,
      drink_until: fullWine.serving.drink_until,
      decant_minutes: fullWine.serving.decant_minutes,
      temperature_celsius: fullWine.serving.temperature_celsius ? Number(fullWine.serving.temperature_celsius) : undefined,
    };
  }
  if (fullWine.food_pairings?.length) target.food_pairings = fullWine.food_pairings;
  if (fullWine.region && !target.region) target.region = fullWine.region;
  if (fullWine.country && !target.country) target.country = fullWine.country;
}

function toMinimalWineData(w: MinimalWine): WineData {
  return {
    name: w.name,
    winery: w.winery || '',
    wine_type: (w.wine_type || 'red') as WineData['wine_type'],
    country: w.country || '',
    region: w.region,
    grapes: w.grapes || (w.grape ? w.grape.split(',').map(g => g.trim()) : []),
    taste_spectrum: w.wine_spectrum,
  };
}

/**
 * Enrich a list of wines with full data (search + match + images).
 *
 * Two-phase approach for speed:
 *  Phase 1 (parallel, all wines): DB cache / GPT search + quickMatchScore
 *  Phase 2 (parallel, top N only): full matchWineToProfile (expensive GPT call)
 *
 * `maxFullMatch` controls how many wines get the full GPT match (default: 2).
 * Set to Infinity to match all wines (original behavior).
 */
export async function enrichWines(
  wines: MinimalWine[],
  typedProfiles: TypedProfiles,
  options: EnrichOptions = {},
): Promise<EnrichedWine[]> {
  const { language, maxFullMatch = 2, skipSearchWhenComplete } = options;
  const hasProfile = Object.keys(typedProfiles).length > 0;

  const { searchWinesByText, matchWineToProfile, quickMatchScore } = await import('@/lib/openai');

  // Track which full WineData we resolved per index for phase 2
  const resolvedFullWines: (WineData | null)[] = new Array(wines.length).fill(null);

  // Phase 1: DB/search + quick scores (all wines in parallel)
  const enriched: EnrichedWine[] = await Promise.all(
    wines.map(async (w, idx): Promise<EnrichedWine> => {
      const base: EnrichedWine = {
        name: w.name,
        winery: w.winery,
        region: w.region,
        grape: w.grape || w.grapes?.join(', '),
        wine_type: w.wine_type,
        country: w.country,
        reason: w.reason,
        tasting_note: w.tasting_note,
        food_pairings: w.food_pairings,
        positive_matches: w.positive_matches,
        mismatches: w.mismatches,
        wine_spectrum: w.wine_spectrum,
        image_url: w.image_url,
        match: w.match,
      };

      const pk = profileKeyForWine(w.wine_type || 'red');
      const rp = hasProfile
        ? (typedProfiles[pk] || typedProfiles.red || {}) as Record<string, unknown>
        : null;

      let fullWine: WineData | null = null;
      const shouldSkipSearch = skipSearchWhenComplete && w.wine_type && w.wine_spectrum;

      if (!shouldSkipSearch) {
        try {
          const query = `${w.name} ${w.winery || ''}`.trim();
          const cached = await findCachedWines(query);
          if (cached.length > 0) {
            fullWine = cached[0];
          } else {
            const found = await searchWinesByText(query);
            fullWine = found?.[0] ?? null;
          }
        } catch { /* search failed, continue with minimal data */ }
      }

      if (fullWine) {
        applyFullWineData(base, fullWine);
        resolvedFullWines[idx] = fullWine;
      }

      // Quick deterministic score for all wines (instant, no GPT)
      if (rp) {
        try {
          const score = quickMatchScore(
            {
              name: w.name,
              winery: w.winery || '',
              wine_type: w.wine_type,
              grapes: w.grapes || (w.grape ? w.grape.split(',').map(g => g.trim()) : []),
              region: w.region,
              country: w.country,
            },
            fullWine?.taste_spectrum || w.wine_spectrum,
            rp,
          );
          if (score !== null) base.match = score;
          const ps = rp.taste_spectrum as TasteSpectrum | undefined;
          if (ps && typeof ps.body === 'number') base.profile_spectrum = ps;
        } catch { /* best-effort */ }
      }

      return base;
    }),
  );

  // Phase 2: Full GPT match for top N wines by quick score
  if (hasProfile && maxFullMatch > 0) {
    const ranked = enriched
      .map((e, i) => ({ idx: i, score: e.match ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFullMatch);

    await Promise.all(
      ranked.map(async ({ idx }) => {
        const w = wines[idx];
        const base = enriched[idx];
        const pk = profileKeyForWine(w.wine_type || 'red');
        const rp = (typedProfiles[pk] || typedProfiles.red || {}) as Record<string, unknown>;

        const wineForMatch = resolvedFullWines[idx] || toMinimalWineData(w);
        try {
          const raw = await matchWineToProfile(wineForMatch, rp, language);
          applyMatchResult(base, raw);
        } catch { /* keep the quick score */ }
      }),
    );
  }

  return enriched;
}

/**
 * Enrich wines that already have full WineData (e.g. from search_wine tool).
 * Skips the searchWinesByText step since data is already complete.
 * Only performs profile matching.
 */
export async function enrichSearchedWines(
  wines: WineData[],
  typedProfiles: TypedProfiles,
  options: { language?: string } = {},
): Promise<EnrichedWine[]> {
  const hasProfile = Object.keys(typedProfiles).length > 0;
  if (!hasProfile) {
    return wines.map(w => ({
      name: w.name,
      winery: w.winery,
      region: w.region,
      grape: w.grapes?.join(', '),
      wine_type: w.wine_type,
      country: w.country,
      image_url: w.image_url,
      food_pairings: w.food_pairings,
      alcohol: w.alcohol != null ? String(w.alcohol) : undefined,
      vivino_rating: w.vivino_rating,
      vivino_reviews: w.vivino_reviews,
      tasting_notes: w.tasting_notes as EnrichedWine['tasting_notes'],
      serving: w.serving ? {
        drink_from: w.serving.drink_from,
        drink_until: w.serving.drink_until,
        decant_minutes: w.serving.decant_minutes,
        temperature_celsius: w.serving.temperature_celsius ? Number(w.serving.temperature_celsius) : undefined,
      } : undefined,
    }));
  }

  const { matchWineToProfile } = await import('@/lib/openai');

  return Promise.all(
    wines.map(async (w): Promise<EnrichedWine> => {
      const base: EnrichedWine = {
        name: w.name,
        winery: w.winery,
        region: w.region,
        grape: w.grapes?.join(', '),
        wine_type: w.wine_type,
        country: w.country,
        image_url: w.image_url,
        food_pairings: w.food_pairings,
        alcohol: w.alcohol != null ? String(w.alcohol) : undefined,
        vivino_rating: w.vivino_rating,
        vivino_reviews: w.vivino_reviews,
        tasting_notes: w.tasting_notes as EnrichedWine['tasting_notes'],
        serving: w.serving ? {
          drink_from: w.serving.drink_from,
          drink_until: w.serving.drink_until,
          decant_minutes: w.serving.decant_minutes,
          temperature_celsius: w.serving.temperature_celsius ? Number(w.serving.temperature_celsius) : undefined,
        } : undefined,
      };

      const pk = profileKeyForWine(w.wine_type || 'red');
      const rp = (typedProfiles[pk] || typedProfiles.red || {}) as Record<string, unknown>;

      try {
        const raw = await matchWineToProfile(w, rp, options.language);
        applyMatchResult(base, raw);
      } catch { /* match is best-effort */ }

      return base;
    }),
  );
}
