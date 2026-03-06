import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWineDiscovery } from '@/lib/sommelier-ai';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { fetchWineImagesForMany } from '@/lib/wine-image';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface DiscoveredWine {
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
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
  profile_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
  vivino_rating?: number;
  vivino_reviews?: number;
  alcohol?: string;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
  serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
  food_pairings?: string[];
  why_drink_it?: string;
  similar_wines_note?: string;
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data, wine_type').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};
    const typedProfiles = profiles?.reduce((acc, p) => {
      if (p.wine_type) acc[p.wine_type] = p.profile_data;
      return acc;
    }, {} as Record<string, unknown>) || {};
    const likedWines: string[] = profiles?.flatMap(p => {
      const d = p.profile_data as Record<string, unknown>;
      return Array.isArray(d?.liked_wines) ? d.liked_wines as string[] : [];
    }) || [];

    let result: { wines?: DiscoveredWine[] };
    try {
      result = await generateWineDiscovery(combinedProfile, likedWines, lang) as { wines?: DiscoveredWine[] };
    } catch (aiErr) {
      console.error('Wine discovery AI error:', aiErr);
      return NextResponse.json({ wines: [], error: 'Discovery AI temporarily unavailable' }, { status: 200 });
    }

    const wines: DiscoveredWine[] = result?.wines || [];

    const hasProfile = Object.keys(typedProfiles).length > 0;
    if (wines.length > 0) {
      const { searchWinesByText, matchWineToProfile, quickMatchScore } = await import('@/lib/openai');
      await Promise.all(
        wines.map(async (w) => {
          const wt = w.wine_type || 'red';
          const pk = wt === 'sparkling' || wt === 'dessert' ? 'white' : wt;
          const rp = hasProfile
            ? (typedProfiles[pk] || typedProfiles.red || {}) as Record<string, unknown>
            : null;
          try {
            const found = await searchWinesByText(`${w.name} ${w.winery || ''}`);
            const fullWine = found?.[0];
            if (fullWine) {
              if (fullWine.vivino_rating) w.vivino_rating = fullWine.vivino_rating;
              if (fullWine.vivino_reviews) w.vivino_reviews = fullWine.vivino_reviews;
              if (fullWine.alcohol) w.alcohol = String(fullWine.alcohol);
              if (fullWine.image_url) w.image_url = fullWine.image_url;
              if (fullWine.tasting_notes) w.tasting_notes = fullWine.tasting_notes;
              if (fullWine.serving) {
                w.serving = {
                  drink_from: fullWine.serving.drink_from,
                  drink_until: fullWine.serving.drink_until,
                  decant_minutes: fullWine.serving.decant_minutes,
                  temperature_celsius: fullWine.serving.temperature_celsius ? Number(fullWine.serving.temperature_celsius) : undefined,
                };
              }
              if (fullWine.food_pairings?.length) w.food_pairings = fullWine.food_pairings;
              if (fullWine.region && !w.region) w.region = fullWine.region;
              if (fullWine.country && !w.country) w.country = fullWine.country;

              if (rp) {
                const raw = await matchWineToProfile(fullWine, rp, lang);
                w.match = raw.match_percentage;
                w.reason = raw.explanation || w.reason;
                w.positive_matches = raw.positive_matches;
                w.mismatches = raw.mismatches;
                w.why_drink_it = raw.why_drink_it;
                w.similar_wines_note = raw.similar_wines_note;
                if (raw.wine_spectrum) w.wine_spectrum = { body: raw.wine_spectrum.body, tannin: raw.wine_spectrum.tannin, sweetness: raw.wine_spectrum.sweetness, acidity: raw.wine_spectrum.acidity };
                if (raw.profile_spectrum) w.profile_spectrum = { body: raw.profile_spectrum.body, tannin: raw.profile_spectrum.tannin, sweetness: raw.profile_spectrum.sweetness, acidity: raw.profile_spectrum.acidity };
              }
              return;
            }
          } catch { /* enrichment failed, fall back to quickMatchScore */ }

          if (rp) {
            try {
              const minimalWine = {
                name: w.name,
                winery: w.winery || '',
                wine_type: (w.wine_type || 'red') as 'red' | 'white' | 'rose' | 'sparkling' | 'dessert',
                country: w.country || '',
                region: w.region,
                grapes: w.grape ? w.grape.split(',').map(g => g.trim()) : [],
                taste_spectrum: w.wine_spectrum,
              };
              const raw = await matchWineToProfile(minimalWine, rp, lang);
              w.match = raw.match_percentage;
              w.reason = raw.explanation || w.reason;
              w.positive_matches = raw.positive_matches;
              w.mismatches = raw.mismatches;
              w.why_drink_it = raw.why_drink_it;
              w.similar_wines_note = raw.similar_wines_note;
              if (raw.wine_spectrum) w.wine_spectrum = { body: raw.wine_spectrum.body, tannin: raw.wine_spectrum.tannin, sweetness: raw.wine_spectrum.sweetness, acidity: raw.wine_spectrum.acidity };
              if (raw.profile_spectrum) w.profile_spectrum = { body: raw.profile_spectrum.body, tannin: raw.profile_spectrum.tannin, sweetness: raw.profile_spectrum.sweetness, acidity: raw.profile_spectrum.acidity };
            } catch {
              try {
                const score = quickMatchScore(
                  { name: w.name, winery: w.winery || '', wine_type: w.wine_type, grapes: w.grape ? w.grape.split(',').map(g => g.trim()) : [], region: w.region, country: w.country },
                  w.wine_spectrum,
                  rp,
                );
                if (score !== null) w.match = score;
                const ps = rp.taste_spectrum as { body: number; tannin: number; sweetness: number; acidity: number } | undefined;
                if (ps && typeof ps.body === 'number') w.profile_spectrum = ps;
              } catch { /* scoring is best-effort */ }
            }
          }
        }),
      );
    }

    // Batch-fetch images for wines still missing one
    const winesMissingImages = wines.filter((w) => !w.image_url);
    if (winesMissingImages.length > 0) {
      try {
        const imgResults = await fetchWineImagesForMany(
          winesMissingImages.map((w) => ({ name: w.name, winery: w.winery || '' })),
        );
        winesMissingImages.forEach((w, i) => {
          const r = imgResults.get(`${i}`);
          if (r) w.image_url = r.url;
        });
      } catch { /* image fetch is best-effort */ }
    }

    incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
      if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
    }).catch(() => {});
    return NextResponse.json({ wines });
  } catch (error) {
    console.error('Discovery error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
