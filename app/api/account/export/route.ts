import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profileRes, tasteRes, cellarRes, wishlistRes, tastingsRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    supabase.from('taste_profiles').select('wine_type, profile_data, updated_at').eq('user_id', user.id),
    supabase
      .from('cellar_items')
      .select('id, quantity, purchase_price, purchase_date, notes, drink_from, drink_until, slot_id, opened_at, consumed_at, is_gift, wines(name, winery, wine_type, country, region, grapes, vivino_rating, alcohol)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('wishlist_items')
      .select('id, priority, notes, wines(name, winery, wine_type, country, region, grapes, vivino_rating, alcohol)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('wine_tastings').select('rating, notes, tasted_at, wines(name, winery)').eq('user_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data ?? null,
    taste_profiles: tasteRes.data ?? [],
    cellar: cellarRes.data ?? [],
    wishlist: wishlistRes.data ?? [],
    tastings: tastingsRes.data ?? [],
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="winejourney-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
