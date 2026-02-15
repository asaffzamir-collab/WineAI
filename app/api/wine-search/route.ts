import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query, image, imageMimeType, userId, tasteProfiles: clientProfiles } = await request.json();

    // Determine locale from cookie
    const cookieStore = await cookies();
    const locale = cookieStore.get('locale')?.value || 'he';

    // Fetch fresh taste profiles from DB when userId is provided; fall back to client-provided profiles
    let tasteProfiles: Record<string, unknown> = clientProfiles || {};
    if (userId) {
      try {
        const dbProfiles = await getTasteProfilesForUser(userId);
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
      const wine = await searchWineByImage(image, imageMimeType || 'image/jpeg');
      if (!wine) {
        return NextResponse.json(
          { error: 'Could not identify wine. Please try a clearer image of the wine label, or search by name.' },
          { status: 200 }
        );
      }
      const match = await getMatchForWine(matchWineToProfile, wine, tasteProfiles, locale);
      return NextResponse.json({ wine, match });
    }

    if (query) {
      const wines = await searchWinesByText(query);
      if (wines.length === 0) {
        return NextResponse.json(
          { error: 'Could not find any matching wines. Try a different spelling or add the winery name.' },
          { status: 200 }
        );
      }
      if (wines.length === 1) {
        const match = await getMatchForWine(matchWineToProfile, wines[0], tasteProfiles, locale);
        return NextResponse.json({ wine: wines[0], match });
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
      { error: 'Search failed' },
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
  const relevantProfile =
    tasteProfiles[wine.wine_type ?? ''] ||
    tasteProfiles.white ||
    tasteProfiles.rose ||
    tasteProfiles.red ||
    {};
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
  return matchWineToProfile(wine, p, locale);
}
