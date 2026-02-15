import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { WineData } from '@/lib/openai';

export const dynamic = 'force-dynamic';

export interface LikedWineDetail {
  name: string;
  winery: string;
  region?: string;
  country?: string;
  wine_type?: string;
  vintage?: number;
  grapes?: string[];
}

function wineToDetail(wine: Record<string, unknown>): LikedWineDetail {
  return {
    name: String(wine.name || ''),
    winery: String(wine.winery || ''),
    region: wine.region ? String(wine.region) : undefined,
    country: wine.country ? String(wine.country) : undefined,
    wine_type: wine.wine_type ? String(wine.wine_type) : undefined,
    vintage: typeof wine.vintage === 'number' ? wine.vintage : undefined,
    grapes: Array.isArray(wine.grapes) ? wine.grapes.map(String) : undefined,
  };
}

function buildMinimalProfile(wine: { name?: string; winery?: string; grapes?: string[] | string; region?: string; country?: string; tasting_notes?: unknown; wine_type?: string; winery_description?: string; vintage?: number }): Record<string, unknown> {
  const grapes = Array.isArray(wine.grapes) ? wine.grapes : (wine.grapes ? [String(wine.grapes)] : []);
  const tastingText = typeof wine.tasting_notes === 'string'
    ? wine.tasting_notes
    : wine.tasting_notes && typeof wine.tasting_notes === 'object'
      ? ([] as string[]).concat(
          (wine.tasting_notes as { nose?: string[] }).nose || [],
          (wine.tasting_notes as { palate?: string[] }).palate || [],
          (wine.tasting_notes as { finish?: string }).finish ? [(wine.tasting_notes as { finish: string }).finish] : []
        ).join(', ')
      : '';
  return {
    overall_style: tastingText || wine.winery_description || `Wines like ${wine.name || 'this wine'}`,
    body_structure: '',
    fruit_profile: '',
    style_notes: tastingText || '',
    recommended_grapes: grapes,
    recommended_regions: wine.region ? [wine.region] : wine.country ? [wine.country] : [],
    what_to_avoid: [],
    summary: `You liked ${wine.name || 'this wine'} by ${wine.winery || 'the winery'}. Your profile will refine as you add more wines.`,
    liked_wines: [wine.name].filter(Boolean),
    liked_wines_detail: [{
      name: wine.name || '',
      winery: wine.winery || '',
      region: wine.region,
      country: wine.country,
      wine_type: wine.wine_type,
      vintage: wine.vintage,
      grapes: grapes.length ? grapes : undefined,
      full_wine: wine as Record<string, unknown>,
    }],
  };
}

/** Stored entry: basic fields + optional full wine snapshot for "view details" */
export type LikedWineEntry = LikedWineDetail & { full_wine?: Record<string, unknown> };

function mergeLikedWineDetail(
  profileData: Record<string, unknown>,
  currentProfileData: Record<string, unknown> | undefined,
  newWine: Record<string, unknown>
): void {
  // Always start from existing DB state so we keep all previously liked wines; AI often returns only the new wine
  const existing = (currentProfileData?.liked_wines_detail as LikedWineEntry[] | undefined) ||
    (profileData.liked_wines_detail as LikedWineEntry[] | undefined) ||
    [];
  const entry: LikedWineEntry = { ...wineToDetail(newWine), full_wine: newWine };
  const seen = new Set(existing.map((w) => `${w.name}|${w.winery}`));
  if (!seen.has(`${entry.name}|${entry.winery}`)) {
    existing.push(entry);
  }
  profileData.liked_wines_detail = existing;
  profileData.liked_wines = existing.map((w) => w.name).filter(Boolean);
}

export async function POST(request: Request) {
  let body: { userId?: string; wine?: Record<string, unknown>; liked?: boolean; rating?: number; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { userId, wine, liked, rating, notes } = body || {};
  if (!userId || !wine || typeof wine !== 'object' || !wine.name || !wine.winery) {
    return NextResponse.json({ error: 'userId and wine (with name, winery) required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {

    // First, upsert the wine data
    const { data: existingWine } = await supabase
      .from('wines')
      .select('id')
      .eq('name', wine.name)
      .eq('winery', wine.winery)
      .single();

    let wineId = existingWine?.id;

    if (!wineId) {
      const { data: newWine, error: wineError } = await supabase
        .from('wines')
        .insert({
          name: wine.name,
          winery: wine.winery,
          vivino_rating: wine.vivino_rating,
          vivino_reviews: wine.vivino_reviews,
          country: wine.country,
          region: wine.region,
          grapes: wine.grapes,
          alcohol: wine.alcohol,
          wine_type: wine.wine_type,
          tasting_notes: wine.tasting_notes,
          ai_description: wine.winery_description,
        })
        .select('id')
        .single();

      if (wineError) throw wineError;
      wineId = newWine.id;
    }

    // Add to wine tastings (user's tasting history)
    const { error: tastingError } = await supabase.from('wine_tastings').insert({
      user_id: userId,
      wine_id: wineId,
      rating: rating || (liked ? 5 : 3),
      notes: notes || (liked ? 'Liked this wine' : 'Tried this wine'),
      tasted_at: new Date().toISOString(),
    });

    if (tastingError) {
      console.error('Tasting insert error:', tastingError);
      // Continue even if tasting insert fails (might be duplicate)
    }

    // taste_profiles only allows red, white, rose — normalize for DB
    const wt = String(wine.wine_type ?? '');
    const profileWineType = ['red', 'white', 'rose'].includes(wt)
      ? wt
      : wt === 'sparkling'
        ? 'white'
        : 'red';

    // Get user's current taste profile for this (normalized) wine type
    const { data: currentProfile } = await supabase
      .from('taste_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .eq('wine_type', profileWineType)
      .single();

    // Update taste profile based on the liked wine (always create/update when liked)
    if (liked) {
      const { updateTasteProfileFromWine } = await import('@/lib/openai');
      let profileData: Record<string, unknown> | null = await updateTasteProfileFromWine(
        wine as unknown as WineData,
        currentProfile?.profile_data || {}
      );

      // If AI didn't return a profile (e.g. API error), build a minimal one from the wine
      if (!profileData || Object.keys(profileData).length === 0) {
        profileData = buildMinimalProfile(wine as Parameters<typeof buildMinimalProfile>[0]);
      }

      mergeLikedWineDetail(profileData, currentProfile?.profile_data as Record<string, unknown> | undefined, wine as Record<string, unknown>);

      const { error: profileError } = await supabase
        .from('taste_profiles')
        .upsert({
          user_id: userId,
          wine_type: profileWineType,
          profile_data: profileData,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,wine_type'
        });

      if (profileError) {
        console.error('Profile update error:', profileError.message);
        return NextResponse.json(
          { error: 'Profile update failed', details: profileError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add wine to profile error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to add wine to profile', details: message },
      { status: 500 }
    );
  }
}
