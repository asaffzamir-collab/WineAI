import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';
import { fetchWineImageUrl, fetchWineImagesForMany } from '@/lib/wine-image';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  // Parse the request body with explicit error handling for large/malformed payloads
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

    // Determine locale from cookie
    const cookieStore = await cookies();
    const locale = cookieStore.get('locale')?.value || 'he';

    // Fetch fresh taste profiles from DB when userId is provided; fall back to client-provided profiles
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

    // Dynamic import so OpenAI is not loaded at build time
    const { searchWinesByText, searchWineByImage, matchWineToProfile } = await import('@/lib/openai');

    if (image) {
      const wine = await searchWineByImage(image as string, (imageMimeType as string) || 'image/jpeg');
      if (!wine) {
        return NextResponse.json(
          { error: 'Could not identify wine. Please try a clearer image of the wine label, or search by name.' },
          { status: 200 }
        );
      }
      // Fetch Vivino image and profile match in parallel
      const [imageUrl, match] = await Promise.all([
        fetchWineImageUrl(wine.name, wine.winery),
        getMatchForWine(matchWineToProfile, wine, tasteProfiles, locale),
      ]);
      if (imageUrl) wine.image_url = imageUrl;
      return NextResponse.json({ wine, match });
    }

    if (query) {
      const wines = await searchWinesByText(query as string);
      if (wines.length === 0) {
        return NextResponse.json(
          { error: 'Could not find any matching wines. Try a different spelling or add the winery name.' },
          { status: 200 }
        );
      }
      if (wines.length === 1) {
        // Fetch Vivino image and profile match in parallel
        const [imageUrl, match] = await Promise.all([
          fetchWineImageUrl(wines[0].name, wines[0].winery),
          getMatchForWine(matchWineToProfile, wines[0], tasteProfiles, locale),
        ]);
        if (imageUrl) wines[0].image_url = imageUrl;
        return NextResponse.json({ wine: wines[0], match });
      }
      // Multiple candidates — fetch images for all in parallel
      const imageResults = await fetchWineImagesForMany(wines);
      for (let i = 0; i < wines.length; i++) {
        const imgUrl = imageResults.get(`${i}`);
        if (imgUrl) wines[i].image_url = imgUrl;
      }
      return NextResponse.json({ wines });
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
