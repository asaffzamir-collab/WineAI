import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFoodPairing } from '@/lib/sommelier-ai';
import { requirePremium } from '@/lib/require-premium';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { fetchWineImagesForMany } from '@/lib/wine-image';
import { enrichWines, type EnrichedWine } from '@/lib/enrich-wines';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PairingSuggestion {
  wine: string;
  winery?: string;
  region?: string;
  grape?: string;
  wine_type?: string;
  reason?: string;
  from_cellar?: boolean;
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

    const { meal, occasion, mood } = await request.json();
    if (!meal && !occasion) return NextResponse.json({ error: 'Meal or occasion required' }, { status: 400 });

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data, wine_type').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};
    const typedProfiles = profiles?.reduce((acc, p) => {
      if (p.wine_type) acc[p.wine_type] = p.profile_data;
      return acc;
    }, {} as Record<string, unknown>) || {};

    const { data: cellarItems } = await supabase.from('cellar_items').select('*, wines(*)').eq('user_id', user.id);
    const cellarWinesEnriched = cellarItems?.map(item => ({
      ...item.wines,
      quantity: item.quantity,
      drink_from: item.drink_from,
      drink_until: item.drink_until,
      cellar_item_id: item.id,
    })) || [];

    const mealOrOccasion = meal || occasion || '';
    const result = await generateFoodPairing(mealOrOccasion, combinedProfile, cellarWinesEnriched, lang, { occasion, mood }) as {
      suggestions?: PairingSuggestion[];
    };

    const suggestions: PairingSuggestion[] = result?.suggestions || [];

    if (suggestions.length > 0) {
      const minimalWines = suggestions.map(s => ({
        name: s.wine,
        winery: s.winery || '',
        region: s.region,
        grape: s.grape,
        wine_type: s.wine_type,
        reason: s.reason,
      }));

      const enriched = await enrichWines(minimalWines, typedProfiles, { language: lang });

      // Carry forward from_cellar metadata and match to cellar items
      const enrichedWithCellar: (EnrichedWine & { from_cellar?: boolean; cellar_item_id?: string; wine?: string })[] = enriched.map((e, i) => {
        const original = suggestions[i];
        const out: EnrichedWine & { from_cellar?: boolean; cellar_item_id?: string; wine?: string } = {
          ...e,
          wine: original.wine,
          from_cellar: original.from_cellar,
        };
        if (original.from_cellar) {
          const cellarMatch = cellarWinesEnriched.find(cw =>
            (cw.name && original.wine && (cw.name as string).toLowerCase() === original.wine.toLowerCase()) ||
            (cw.name && original.wine && original.wine.toLowerCase().includes((cw.name as string).toLowerCase()))
          );
          if (cellarMatch?.cellar_item_id) out.cellar_item_id = cellarMatch.cellar_item_id;
          if (cellarMatch?.image_url && !out.image_url) out.image_url = cellarMatch.image_url as string;
        }
        return out;
      });

      const missingIndices = enrichedWithCellar.map((w, i) => (!w.image_url ? i : -1)).filter(i => i >= 0);
      if (missingIndices.length > 0) {
        const imageMap = await fetchWineImagesForMany(
          missingIndices.map(i => ({ name: enrichedWithCellar[i].name, winery: enrichedWithCellar[i].winery || '' }))
        );
        missingIndices.forEach((wineIdx, mapIdx) => {
          const imgResult = imageMap.get(String(mapIdx));
          if (imgResult?.url) enrichedWithCellar[wineIdx].image_url = imgResult.url;
        });
      }

      incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
        if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
      }).catch(() => {});
      return NextResponse.json({ suggestions: enrichedWithCellar });
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
