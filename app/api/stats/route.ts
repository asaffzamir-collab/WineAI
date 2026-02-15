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

    const [profileRes, tastingsRes, cellarRes, wishlistRes] = await Promise.all([
      supabase.from('user_profiles').select('display_name').eq('id', userId).single(),
      supabase.from('wine_tastings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('cellar_items').select('quantity, purchase_price, drink_from, drink_until').eq('user_id', userId),
      supabase.from('wishlist_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    const cellarItems = cellarRes.data ?? [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const bottlesInCellar = cellarItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalSpent = cellarItems.reduce(
      (sum, item) => sum + (item.purchase_price || 0) * (item.quantity || 0),
      0
    );
    const readyToDrink = cellarItems.filter((item) => {
      const drinkFrom = item.drink_from ? new Date(item.drink_from).getFullYear() : 0;
      const drinkUntil = item.drink_until ? new Date(item.drink_until).getFullYear() : 9999;
      return currentYear >= drinkFrom && currentYear <= drinkUntil;
    }).length;

    return NextResponse.json({
      displayName: profileRes.data?.display_name ?? null,
      winesTasted: tastingsRes.count ?? 0,
      bottlesInCellar,
      wishlistCount: wishlistRes.count ?? 0,
      readyToDrink,
      totalSpent,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
