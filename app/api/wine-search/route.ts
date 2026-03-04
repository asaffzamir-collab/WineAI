import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';
import { findCachedWines, cacheTasteSpectrum, findCachedImageUrl } from '@/lib/wine-cache';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { createClient } from '@/lib/supabase/server';

async function persistMatchToDb(userId: string, wine: WineData, match: ProfileMatchResult): Promise<void> {
  try {
    const key = `${(wine.name || '').trim().toLowerCase()}|${(wine.winery || '').trim().toLowerCase()}`;
    const supabase = await createClient();
    await supabase
      .from('wine_match_cache')
      .upsert(
        { user_id: userId, wine_key: key, match_data: match, created_at: new Date().toISOString() },
        { onConflict: 'user_id,wine_key' }
      );
  } catch { /* best-effort */ }
}

async function fillCachedImages(wines: WineData[]): Promise<void> {
  for (const w of wines) {
    if (!w.image_url) {
      try {
        const cached = await findCachedImageUrl(w.name, w.winery);
        if (cached) w.image_url = cached;
      } catch { /* best-effort */ }
    }
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const t0 = performance.now();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (parseErr) {
    console.error('Failed to parse request body:', parseErr);
    return NextResponse.json(
      { error: 'Invalid request. The image may be too large — please try a smaller photo.' },
      { status: 400 }
    );
  }

  try {
    const { query, image, imageMimeType, userId, tasteProfiles: clientProfiles } = body;

    if (userId) {
      const usageBlock = await requireUsage(userId as string, 'wine_search');
      if (usageBlock) return usageBlock;
    }

    const cookieStore = await cookies();
    const locale = cookieStore.get('locale')?.value || 'he';

    let tasteProfiles: Record<string, unknown> = (clientProfiles as Record<string, unknown>) || {};
    if (userId) {
      try {
        const dbProfiles = await getTasteProfilesForUser(userId as string);
        if (dbProfiles && Object.keys(dbProfiles).length > 0) {
          tasteProfiles = dbProfiles;
        }
      } catch (e) {
        console.error('Failed to fetch taste profiles from DB:', e);
      }
    }

    const tProfile = performance.now();

    const { searchWinesByText, searchWineByImage, matchWineToProfile } = await import('@/lib/openai');

    const tImport = performance.now();

    if (image) {
      const wine = await searchWineByImage(image as string, (imageMimeType as string) || 'image/jpeg');
      const tSearch = performance.now();
      if (!wine) {
        return NextResponse.json(
          { error: 'Could not identify wine. Please try a clearer image of the wine label, or search by name.' },
          { status: 200 }
        );
      }
      await fillCachedImages([wine]);
      const match = await getMatchForWine(matchWineToProfile, wine, tasteProfiles, locale);
      const tMatch = performance.now();
      if (match && userId) persistMatchToDb(userId as string, wine, match).catch(() => {});
      if (wine.taste_spectrum && typeof wine.taste_spectrum.body === 'number') {
        cacheTasteSpectrum(wine.name, wine.winery, wine.taste_spectrum).catch(() => {});
      }
      if (userId) {
        incrementUsage(userId as string, 'wine_search').then(({ thresholdHit }) => {
          if (thresholdHit) notifyAdminUsageThreshold(userId as string, 'wine_search', thresholdHit);
        }).catch(() => {});
      }
      return NextResponse.json({
        wine, match,
        _timing: {
          profile_ms: Math.round(tProfile - t0),
          import_ms: Math.round(tImport - tProfile),
          search_ms: Math.round(tSearch - tImport),
          match_ms: Math.round(tMatch - tSearch),
          total_ms: Math.round(tMatch - t0),
        },
      });
    }

    if (query) {
      const cached = await findCachedWines(query as string);
      const wines = cached.length > 0
        ? cached
        : await searchWinesByText(query as string);

      const tSearch = performance.now();

      if (wines.length === 0) {
        return NextResponse.json(
          { error: 'Could not find any matching wines. Try a different spelling or add the winery name.' },
          { status: 200 }
        );
      }

      await fillCachedImages(wines);
      const tImages = performance.now();

      const isSingle = wines.length === 1;
      const match = isSingle
        ? await getMatchForWine(matchWineToProfile, wines[0], tasteProfiles, locale)
        : null;

      const tMatch = performance.now();

      for (const w of wines) {
        if (w.taste_spectrum && typeof w.taste_spectrum.body === 'number') {
          cacheTasteSpectrum(w.name, w.winery, w.taste_spectrum).catch(() => {});
        }
      }

      if (userId) {
        incrementUsage(userId as string, 'wine_search').then(({ thresholdHit }) => {
          if (thresholdHit) notifyAdminUsageThreshold(userId as string, 'wine_search', thresholdHit);
        }).catch(() => {});
      }

      const timing = {
        profile_ms: Math.round(tProfile - t0),
        import_ms: Math.round(tImport - tProfile),
        search_ms: Math.round(tSearch - tImport),
        images_ms: Math.round(tImages - tSearch),
        match_ms: Math.round(tMatch - tImages),
        total_ms: Math.round(tMatch - t0),
        cached: cached.length > 0,
      };

      if (isSingle) {
        if (match && userId) persistMatchToDb(userId as string, wines[0], match).catch(() => {});
        return NextResponse.json({ wine: wines[0], match, _timing: timing });
      }
      return NextResponse.json({ wines, _timing: timing });
    }

    return NextResponse.json(
      { error: 'No query or image provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Wine search error:', error);
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}

async function getMatchForWine(
  matchWineToProfile: (wine: WineData, profile: Record<string, unknown>, language?: string) => Promise<ProfileMatchResult>,
  wine: WineData,
  tasteProfiles: Record<string, unknown> | undefined,
  locale?: string
) {
  if (!tasteProfiles || typeof tasteProfiles !== 'object' || Object.keys(tasteProfiles).length === 0) {
    return null;
  }
  // Only match against the profile for the SAME wine type — no cross-category fallbacks
  const wineType = wine.wine_type ?? '';
  // Normalize: sparkling → white, dessert → white
  const profileKey = wineType === 'sparkling' || wineType === 'dessert' ? 'white' : wineType;
  const relevantProfile = tasteProfiles[profileKey];
  if (!relevantProfile) return null;
  const p = relevantProfile as Record<string, unknown>;
  const hasProfileContent =
    typeof p === 'object' &&
    p !== null &&
    (Array.isArray(p.liked_wines_detail) && p.liked_wines_detail.length > 0 ||
      Array.isArray(p.liked_wines) && p.liked_wines.length > 0 ||
      (Array.isArray(p.recommended_grapes) && p.recommended_grapes.length > 0) ||
      (typeof p.overall_style === 'string' && p.overall_style.length > 0) ||
      (typeof p.summary === 'string' && p.summary.length > 0));
  if (!hasProfileContent) return null;

  // Skip matching if profile is built from ≤1 liked wines and NOT from onboarding.
  // A profile built from a single wine can't meaningfully match other wines yet.
  const likedWines = Array.isArray(p.liked_wines_detail) ? p.liked_wines_detail : [];
  if (!p.from_onboarding && likedWines.length <= 1) {
    return null;
  }

  const match = await matchWineToProfile(wine, p, locale);

  if (match) {
    // Prefer wine's own taste_spectrum (from search) over AI match-time estimate
    if (wine.taste_spectrum && typeof wine.taste_spectrum.body === 'number') {
      match.wine_spectrum = wine.taste_spectrum;
    }
    // Always use real DB profile spectrum — never AI-generated
    delete match.profile_spectrum;
    if (p.taste_spectrum && typeof p.taste_spectrum === 'object') {
      match.profile_spectrum = p.taste_spectrum as { body: number; tannin: number; sweetness: number; acidity: number };
    }
  }
  return match;
}
