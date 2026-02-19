import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewCellarPage } from '@/components/cellar/cellar-page';
import type { CellarItem } from '@/components/pages/cellar-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/');
  }

  const userId = session.user.id;
  let cellarItems: CellarItem[] = [];
  try {
    let { data, error } = await supabase
      .from('cellar_items')
      .select(`
        id, quantity, purchase_price, purchase_date, notes,
        drink_from, drink_until, slot_id,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error && error.message?.includes('slot_id')) {
      const fallback = await supabase
        .from('cellar_items')
        .select(`
          id, quantity, purchase_price, purchase_date, notes,
          drink_from, drink_until,
          wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      data = fallback.data as typeof data;
      error = fallback.error;
    }
    cellarItems = (data as CellarItem[]) || [];
  } catch (e) {
    console.error('Cellar page error:', e);
  }

  return <NewCellarPage userId={userId} initialItems={cellarItems} />;
}
