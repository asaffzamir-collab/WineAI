import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/require-user';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const { error: authError } = await requireUser(userId);
    if (authError) return authError;
    const supabase = await createClient();

    const [profileRes, tastingsRes, cellarRes, wishlistRes, tasteProfilesRes, sommelierProfileRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('id', userId).single(),
      supabase.from('wine_tastings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('cellar_items')
        .select('id, quantity, purchase_price, drink_from, drink_until, created_at, opened_at, consumed_at, wines(name, winery, wine_type, country, region, grapes, vivino_rating, vivino_reviews, alcohol, tasting_notes, image_url, image_source, serving, food_pairings, ai_description)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('wishlist_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('taste_profiles').select('wine_type, profile_data').eq('user_id', userId),
      supabase.from('sommelier_profiles').select('discovery_data').eq('user_id', userId).single(),
    ]);

    const rawCellarItems = cellarRes.data ?? [];
    // Filter out items with broken/missing wine references to match the cellar page,
    // which skips items where the wine join returns null.
    const cellarItems = rawCellarItems.filter((item) => {
      const wine = Array.isArray(item.wines) ? item.wines[0] : item.wines;
      return wine != null;
    });
    if (rawCellarItems.length !== cellarItems.length) {
      console.warn(`[stats] Filtered out ${rawCellarItems.length - cellarItems.length} cellar items with missing wine data (${rawCellarItems.length} raw → ${cellarItems.length} valid)`);
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    // Separate consumed wines from active ones (untouched + opened)
    const activeItems = cellarItems.filter(
      (item) => !(item as Record<string, unknown>).consumed_at || item.quantity > 0
    );

    const winesOpened = cellarItems.filter(
      (item) => (item as Record<string, unknown>).opened_at && !(item as Record<string, unknown>).consumed_at && item.quantity > 0
    ).length;

    const winesConsumed = cellarItems.filter(
      (item) => !!(item as Record<string, unknown>).consumed_at
    ).length;

    const OPEN_WINE_DAYS: Record<string, number> = {
      red: 5, white: 3, rose: 3, sparkling: 1, dessert: 14,
    };
    const openWineAlerts = cellarItems
      .filter((item) => (item as Record<string, unknown>).opened_at && !(item as Record<string, unknown>).consumed_at && item.quantity > 0)
      .map((item) => {
        const wine = Array.isArray(item.wines) ? item.wines[0] : item.wines;
        const w = wine as Record<string, unknown> | null;
        const wineType = ((w?.wine_type as string) || '').toLowerCase();
        const maxDays = OPEN_WINE_DAYS[wineType] ?? 5;
        const elapsed = Math.floor((Date.now() - new Date((item as Record<string, unknown>).opened_at as string).getTime()) / 86400000);
        const remaining = maxDays - elapsed;
        return { wineName: w?.name as string, winery: w?.winery as string, remaining, isExpired: remaining <= 0 };
      })
      .filter((a) => a.remaining <= 1);

    // All counts/insights below use activeItems only
    const bottlesInCellar = activeItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalSpent = activeItems.reduce(
      (sum, item) => sum + (item.purchase_price || 0) * (item.quantity || 0),
      0
    );

    const cellarItemValues: { id: string; value: number }[] = activeItems.map((item) => ({
      id: item.id,
      value: (item.purchase_price || 0) * (item.quantity || 0),
    }));

    const readyToDrink = activeItems.filter((item) => {
      const drinkFrom = item.drink_from ? new Date(item.drink_from).getFullYear() : 0;
      const drinkUntil = item.drink_until ? new Date(item.drink_until).getFullYear() : 9999;
      return currentYear >= drinkFrom && currentYear <= drinkUntil;
    }).length;

    // Expiring wines: drink_until is within the next 6 months
    const expiringWines = activeItems.filter((item) => {
      if (!item.drink_until) return false;
      const drinkUntilDate = new Date(item.drink_until);
      return drinkUntilDate >= now && drinkUntilDate <= sixMonthsFromNow;
    }).length;

    // Recent cellar additions (last 3, active only)
    const recentCellarItems = activeItems.slice(0, 3).map((item) => {
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

    // Wine type distribution (active only)
    const typeCount: Record<string, number> = {};
    for (const item of activeItems) {
      const wine = item.wines as unknown as Record<string, unknown> | null;
      const wineType = (wine?.wine_type as string) || 'unknown';
      typeCount[wineType] = (typeCount[wineType] || 0) + (item.quantity || 1);
    }

    // Top countries (active only)
    const countryCount: Record<string, number> = {};
    for (const item of activeItems) {
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

    let likedWinesCount = 0;
    for (const tp of (tasteProfilesRes.data ?? [])) {
      const pd = tp.profile_data as Record<string, unknown> | null;
      if (pd && Array.isArray(pd.liked_wines)) likedWinesCount += pd.liked_wines.length;
    }

    return NextResponse.json({
      displayName: profileRes.data?.display_name ?? null,
      winesTasted: tastingsRes.count ?? 0,
      winesOpened,
      winesConsumed,
      openWineAlerts,
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
      likedWinesCount,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
