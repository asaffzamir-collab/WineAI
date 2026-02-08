import { createClient, createAdminClient } from '@/lib/supabase/server';
import { CellarPage, type CellarItem } from '@/components/pages/cellar-page';

export const dynamic = 'force-dynamic';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export default async function Page() {
  const userId = MOCK_USER_ID;
  const supabase = await createClient();
  const client = userId === MOCK_USER_ID ? createAdminClient() : supabase;

  let cellarItems: CellarItem[] = [];
  try {
    const { data } = await client
      .from('cellar_items')
      .select(`
        id, quantity, purchase_price, purchase_date, storage_location, notes, bottle_photo_url,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    cellarItems = (data as CellarItem[]) || [];
  } catch (e) {
    console.error('Cellar page error:', e);
  }
  return <CellarPage userId={userId} initialItems={cellarItems} />;
}
