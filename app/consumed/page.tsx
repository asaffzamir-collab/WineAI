import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConsumedWinesPage } from '@/components/pages/consumed-wines-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/');
  }

  const userId = session.user.id;

  const { data } = await supabase
    .from('cellar_items')
    .select(`
      id, quantity, purchase_price, purchase_date, notes,
      drink_from, drink_until, consumed_at,
      wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url, tasting_notes, serving, food_pairings, ai_description, alcohol, vivino_reviews)
    `)
    .eq('user_id', userId)
    .not('consumed_at', 'is', null)
    .order('consumed_at', { ascending: false });

  return <ConsumedWinesPage items={data ?? []} userId={userId} />;
}
