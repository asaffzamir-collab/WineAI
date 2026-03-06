import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { getTasteProfilesForUser } from '@/lib/get-taste-profiles';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

function wineKey(name: string, winery: string): string {
  return `${name.trim().toLowerCase()}|${winery.trim().toLowerCase()}`;
}

async function getDbCachedMatch(userId: string, key: string): Promise<ProfileMatchResult | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('wine_match_cache')
      .select('match_data')
      .eq('user_id', userId)
      .eq('wine_key', key)
      .single();
    if (data?.match_data) return data.match_data as ProfileMatchResult;
  } catch { /* miss */ }
  return null;
}

async function setDbCachedMatch(userId: string, key: string, match: ProfileMatchResult): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from('wine_match_cache')
      .upsert(
        { user_id: userId, wine_key: key, match_data: match, created_at: new Date().toISOString() },
        { onConflict: 'user_id,wine_key' }
      );
  } catch { /* best-effort */ }
}

export async function PUT(request: Request) {
  try {
    const { userId, wine, match } = await request.json();
    if (!userId || !wine?.name || !wine?.winery || !match?.explanation) {
      return NextResponse.json({ error: 'userId, wine, and match with explanation required' }, { status: 400 });
    }
    const key = wineKey(wine.name, wine.winery);
    await setDbCachedMatch(userId, key, match);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Cache failed' }, { status: 500 });
  }
}

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

    const cookieStore = await cookies();
    const locale = cookieStore.get('locale')?.value || 'he';

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

    const likedWines = Array.isArray(p.liked_wines_detail) ? p.liked_wines_detail : [];
    if (!p.from_onboarding && likedWines.length <= 1) {
      return NextResponse.json({ match: null });
    }

    const wineData = wine as WineData;
    const key = userId ? wineKey(wineData.name || '', wineData.winery || '') : '';

    let match: ProfileMatchResult | null = null;

    if (key && userId) {
      match = await getDbCachedMatch(userId, key);
    }

    if (!match) {
      match = await matchWineToProfile(wineData, p, locale);
      if (match && match.explanation && key && userId) {
        await setDbCachedMatch(userId, key, { ...match });
      }
    }

    if (match) {
      const ws = wineData.taste_spectrum;
      if (ws && typeof ws.body === 'number') {
        match.wine_spectrum = ws;
      }
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
