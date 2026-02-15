import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { WineData } from '@/lib/openai';
import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { matchWineToProfile } = await import('@/lib/openai');
    const { wine, userId, tasteProfiles: clientProfiles } = await request.json();
    if (!wine || typeof wine !== 'object') {
      return NextResponse.json(
        { error: 'Wine object required' },
        { status: 400 }
      );
    }

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

    if (!tasteProfiles || typeof tasteProfiles !== 'object' || Object.keys(tasteProfiles).length === 0) {
      return NextResponse.json({ match: null });
    }
    // Only match against the profile for the SAME wine type — no cross-category fallbacks
    const wineType = (wine as WineData).wine_type ?? '';
    const profileKey = wineType === 'sparkling' || wineType === 'dessert' ? 'white' : wineType;
    const relevantProfile = tasteProfiles[profileKey];
    if (!relevantProfile) {
      return NextResponse.json({ match: null });
    }
    const p = relevantProfile as Record<string, unknown>;
    const hasProfileContent =
      typeof p === 'object' &&
      p !== null &&
      (Array.isArray(p.liked_wines_detail) && p.liked_wines_detail.length > 0 ||
        Array.isArray(p.liked_wines) && p.liked_wines.length > 0 ||
        (Array.isArray(p.recommended_grapes) && p.recommended_grapes.length > 0) ||
        (typeof p.overall_style === 'string' && p.overall_style.length > 0) ||
        (typeof p.summary === 'string' && p.summary.length > 0));
    if (!hasProfileContent) {
      return NextResponse.json({ match: null });
    }

    // Skip matching if profile is built from ≤1 liked wines and NOT from onboarding.
    // A profile built from a single wine can't meaningfully match other wines yet.
    const likedWines = Array.isArray(p.liked_wines_detail) ? p.liked_wines_detail : [];
    if (!p.from_onboarding && likedWines.length <= 1) {
      return NextResponse.json({ match: null });
    }

    const match = await matchWineToProfile(wine as WineData, p, locale);

    if (match) {
      // Prefer wine's own taste_spectrum (from search) over AI match-time estimate
      const ws = (wine as WineData).taste_spectrum;
      if (ws && typeof ws.body === 'number') {
        match.wine_spectrum = ws;
      }
      // Always use real DB profile spectrum — never AI-generated
      delete match.profile_spectrum;
      if (p.taste_spectrum && typeof p.taste_spectrum === 'object') {
        match.profile_spectrum = p.taste_spectrum as { body: number; tannin: number; sweetness: number; acidity: number };
      }
    }
    return NextResponse.json({ match });
  } catch (error) {
    console.error('Wine match error:', error);
    return NextResponse.json(
      { error: 'Match failed' },
      { status: 500 }
    );
  }
}
