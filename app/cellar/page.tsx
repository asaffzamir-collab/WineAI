import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NewCellarPage } from '@/components/cellar/cellar-page';
import type { CellarItem } from '@/components/pages/cellar-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const userId = user.id;
  let cellarItems: CellarItem[] = [];
  try {
    const { data } = await supabase
      .from('cellar_items')
      .select(`
        id, quantity, purchase_price, purchase_date, storage_location, notes, bottle_photo_url,
        drink_from, drink_until,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, vivino_reviews, alcohol, tasting_notes, ai_description, image_url, serving, food_pairings)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    cellarItems = (data as CellarItem[]) || [];
  } catch (e) {
    console.error('Cellar page error:', e);
  }

  return <NewCellarPage userId={userId} initialItems={cellarItems} />;
}
