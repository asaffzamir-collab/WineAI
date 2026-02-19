import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const supabase = await createClient();

    const [profileRes, tastingsRes, cellarRes, wishlistRes, tasteProfilesRes, sommelierProfileRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('id', userId).single(),
      supabase.from('wine_tastings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('cellar_items')
        .select('id, quantity, purchase_price, drink_from, drink_until, created_at, wines(name, winery, wine_type, country, region, grapes, vivino_rating, vivino_reviews, alcohol, tasting_notes, image_url, serving, food_pairings, ai_description)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('wishlist_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('taste_profiles').select('wine_type').eq('user_id', userId),
      supabase.from('sommelier_profiles').select('discovery_data').eq('user_id', userId).single(),
    ]);

    const cellarItems = cellarRes.data ?? [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const bottlesInCellar = cellarItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalSpent = cellarItems.reduce(
      (sum, item) => sum + (item.purchase_price || 0) * (item.quantity || 0),
      0
    );

    const cellarItemValues: { id: string; value: number }[] = cellarItems.map((item) => ({
      id: item.id,
      value: (item.purchase_price || 0) * (item.quantity || 0),
    }));

    const readyToDrink = cellarItems.filter((item) => {
      const drinkFrom = item.drink_from ? new Date(item.drink_from).getFullYear() : 0;
      const drinkUntil = item.drink_until ? new Date(item.drink_until).getFullYear() : 9999;
      return currentYear >= drinkFrom && currentYear <= drinkUntil;
    }).length;

    // Expiring wines: drink_until is within the next 6 months
    const expiringWines = cellarItems.filter((item) => {
      if (!item.drink_until) return false;
      const drinkUntilDate = new Date(item.drink_until);
      return drinkUntilDate >= now && drinkUntilDate <= sixMonthsFromNow;
    }).length;

    // Recent cellar additions (last 3) — include full wine data to avoid extra API calls
    const recentCellarItems = cellarItems.slice(0, 3).map((item) => {
      const wine = item.wines as unknown as Record<string, unknown> | null;
      return {
        id: item.id,
        wineName: wine?.name ?? 'Unknown',
        winery: wine?.winery ?? '',
        createdAt: item.created_at,
        imageUrl: wine?.image_url ?? null,
        wineType: wine?.wine_type ?? 'red',
        country: wine?.country ?? '',
        region: wine?.region ?? '',
        grapes: wine?.grapes ?? [],
        vivinoRating: wine?.vivino_rating ?? null,
        vivinoReviews: wine?.vivino_reviews ?? null,
        alcohol: wine?.alcohol ?? null,
        tastingNotes: wine?.tasting_notes ?? null,
        serving: wine?.serving ?? null,
        foodPairings: wine?.food_pairings ?? null,
        aiDescription: wine?.ai_description ?? null,
        purchasePrice: item.purchase_price,
        quantity: item.quantity,
      };
    });

    // Wine type distribution from cellar
    const typeCount: Record<string, number> = {};
    for (const item of cellarItems) {
      const wine = item.wines as unknown as Record<string, unknown> | null;
      const wineType = (wine?.wine_type as string) || 'unknown';
      typeCount[wineType] = (typeCount[wineType] || 0) + (item.quantity || 1);
    }

    // Top countries from cellar
    const countryCount: Record<string, number> = {};
    for (const item of cellarItems) {
      const wine = item.wines as unknown as Record<string, unknown> | null;
      const country = wine?.country as string | undefined;
      if (country) {
        countryCount[country] = (countryCount[country] || 0) + (item.quantity || 1);
      }
    }
    const topCountries = Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Profile completeness
    const profileTypes = (tasteProfilesRes.data ?? []).map((p) => p.wine_type);
    const hasRedProfile = profileTypes.includes('red');
    const hasWhiteProfile = profileTypes.includes('white');
    const hasRoseProfile = profileTypes.includes('rose');
    const hasSommelierDiscovery = !!sommelierProfileRes.data?.discovery_data && Object.keys(sommelierProfileRes.data.discovery_data as object).length > 0;

    return NextResponse.json({
      displayName: profileRes.data?.display_name ?? null,
      winesTasted: tastingsRes.count ?? 0,
      bottlesInCellar,
      wishlistCount: wishlistRes.count ?? 0,
      readyToDrink,
      totalSpent,
      cellarItemValues,
      expiringWines,
      recentCellarItems,
      wineTypeDistribution: typeCount,
      topCountries,
      hasRedProfile,
      hasWhiteProfile,
      hasRoseProfile,
      hasSommelierDiscovery,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
