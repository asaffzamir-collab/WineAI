import { NextResponse } from 'next/server';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query, image, imageMimeType, tasteProfiles } = await request.json();

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
      const match = await getMatchForWine(matchWineToProfile, wine, tasteProfiles);
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
        const match = await getMatchForWine(matchWineToProfile, wines[0], tasteProfiles);
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
  matchWineToProfile: (wine: WineData, profile: Record<string, unknown>) => Promise<ProfileMatchResult>,
  wine: WineData,
  tasteProfiles: Record<string, unknown> | undefined
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
  return matchWineToProfile(wine, p);
}
