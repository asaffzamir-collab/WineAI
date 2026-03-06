import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFoodPairing } from '@/lib/sommelier-ai';
import { requirePremium } from '@/lib/require-premium';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PairingSuggestion {
  wine: string;
  winery?: string;
  region?: string;
  grape?: string;
  wine_type?: string;
  reason?: string;
}

interface EnrichedSuggestion extends PairingSuggestion {
  country?: string;
  match?: number;
  image_url?: string;
  food_pairings?: string[];
  alcohol?: string;
  vivino_rating?: number;
  vivino_reviews?: number;
  tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string };
  tasting_note?: string;
  serving?: { drink_from?: number; drink_until?: number; decant_minutes?: number; temperature_celsius?: number };
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
  profile_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
  why_drink_it?: string;
  similar_wines_note?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const premiumBlock = await requirePremium(user.id, 'food_pairing');
    if (premiumBlock) return premiumBlock;

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

    const { meal } = await request.json();
    if (!meal) return NextResponse.json({ error: 'Meal required' }, { status: 400 });

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data, wine_type').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};
    const typedProfiles = profiles?.reduce((acc, p) => {
      if (p.wine_type) acc[p.wine_type] = p.profile_data;
      return acc;
    }, {} as Record<string, unknown>) || {};

    const { data: cellarItems } = await supabase.from('cellar_items').select('*, wines(*)').eq('user_id', user.id);
    const cellarWines = cellarItems?.map(item => item.wines) || [];

    const result = await generateFoodPairing(meal, combinedProfile, cellarWines, lang) as {
      suggestions?: PairingSuggestion[];
    };

    const suggestions: PairingSuggestion[] = result?.suggestions || [];
    const hasProfile = Object.keys(typedProfiles).length > 0;

    if (suggestions.length > 0) {
      const { searchWinesByText, matchWineToProfile, quickMatchScore } = await import('@/lib/openai');
      const enriched: EnrichedSuggestion[] = await Promise.all(
        suggestions.map(async (s) => {
          const base: EnrichedSuggestion = { ...s };
          const wt = s.wine_type || 'red';
          const pk = wt === 'sparkling' || wt === 'dessert' ? 'white' : wt;
          const rp = hasProfile
            ? (typedProfiles[pk] || typedProfiles.red || {}) as Record<string, unknown>
            : null;

          try {
            const found = await searchWinesByText(`${s.wine} ${s.winery || ''}`);
            const fullWine = found?.[0];
            if (fullWine) {
              if (fullWine.vivino_rating) base.vivino_rating = fullWine.vivino_rating;
              if (fullWine.vivino_reviews) base.vivino_reviews = fullWine.vivino_reviews;
              if (fullWine.alcohol) base.alcohol = String(fullWine.alcohol);
              if (fullWine.image_url) base.image_url = fullWine.image_url;
              if (fullWine.tasting_notes) base.tasting_notes = fullWine.tasting_notes as EnrichedSuggestion['tasting_notes'];
              if (fullWine.serving) {
                base.serving = {
                  drink_from: fullWine.serving.drink_from,
                  drink_until: fullWine.serving.drink_until,
                  decant_minutes: fullWine.serving.decant_minutes,
                  temperature_celsius: fullWine.serving.temperature_celsius ? Number(fullWine.serving.temperature_celsius) : undefined,
                };
              }
              if (fullWine.food_pairings?.length) base.food_pairings = fullWine.food_pairings;
              if (fullWine.region && !base.region) base.region = fullWine.region;
              if (fullWine.country) base.country = fullWine.country;

              if (rp) {
                const raw = await matchWineToProfile(fullWine, rp, lang);
                base.match = raw.match_percentage;
                base.reason = raw.explanation || base.reason;
                base.positive_matches = raw.positive_matches;
                base.mismatches = raw.mismatches;
                base.why_drink_it = raw.why_drink_it;
                base.similar_wines_note = raw.similar_wines_note;
                if (raw.wine_spectrum) base.wine_spectrum = { body: raw.wine_spectrum.body, tannin: raw.wine_spectrum.tannin, sweetness: raw.wine_spectrum.sweetness, acidity: raw.wine_spectrum.acidity };
                if (raw.profile_spectrum) base.profile_spectrum = { body: raw.profile_spectrum.body, tannin: raw.profile_spectrum.tannin, sweetness: raw.profile_spectrum.sweetness, acidity: raw.profile_spectrum.acidity };
              }
              return base;
            }
          } catch { /* enrichment failed */ }

          if (rp) {
            try {
              const minimalWine = {
                name: s.wine,
                winery: s.winery || '',
                wine_type: (wt || 'red') as 'red' | 'white' | 'rose' | 'sparkling' | 'dessert',
                country: '',
                region: s.region,
                grapes: s.grape ? s.grape.split(',').map(g => g.trim()) : [],
              };
              const raw = await matchWineToProfile(minimalWine, rp, lang);
              base.match = raw.match_percentage;
              base.reason = raw.explanation || base.reason;
              base.positive_matches = raw.positive_matches;
              base.mismatches = raw.mismatches;
              base.why_drink_it = raw.why_drink_it;
              base.similar_wines_note = raw.similar_wines_note;
              if (raw.wine_spectrum) base.wine_spectrum = { body: raw.wine_spectrum.body, tannin: raw.wine_spectrum.tannin, sweetness: raw.wine_spectrum.sweetness, acidity: raw.wine_spectrum.acidity };
              if (raw.profile_spectrum) base.profile_spectrum = { body: raw.profile_spectrum.body, tannin: raw.profile_spectrum.tannin, sweetness: raw.profile_spectrum.sweetness, acidity: raw.profile_spectrum.acidity };
            } catch {
              try {
                const score = quickMatchScore(
                  { name: s.wine, winery: s.winery || '', wine_type: s.wine_type, grapes: s.grape ? s.grape.split(',').map(g => g.trim()) : [], region: s.region },
                  undefined,
                  rp,
                );
                if (score !== null) base.match = score;
                const ps = rp.taste_spectrum as { body: number; tannin: number; sweetness: number; acidity: number } | undefined;
                if (ps && typeof ps.body === 'number') base.profile_spectrum = ps;
              } catch { /* best-effort */ }
            }
          }
          return base;
        }),
      );

      const { fetchWineImagesForMany } = await import('@/lib/wine-image');
      const missingIndices = enriched.map((w, i) => (!w.image_url ? i : -1)).filter(i => i >= 0);
      if (missingIndices.length > 0) {
        const imageMap = await fetchWineImagesForMany(
          missingIndices.map(i => ({ name: enriched[i].wine, winery: enriched[i].winery || '' }))
        );
        missingIndices.forEach((wineIdx, mapIdx) => {
          const result = imageMap.get(String(mapIdx));
          if (result?.url) enriched[wineIdx].image_url = result.url;
        });
      }

      incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
        if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
      }).catch(() => {});
      return NextResponse.json({ suggestions: enriched });
    }

    incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
      if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
    }).catch(() => {});
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pairing error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
