import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WishlistPage } from '@/components/pages/wishlist-page';

export const dynamic = 'force-dynamic';

interface WishlistItem {
  id: string;
  priority?: number;
  notes?: string;
  wines: {
    id: string;
    name: string;
    winery: string;
    wine_type: string;
    country?: string;
    region?: string;
    grapes?: string[];
    vivino_rating?: number;
    vivino_reviews?: number;
    alcohol?: number;
    tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string } | null;
    ai_description?: string | null;
    image_url?: string;
    serving?: Record<string, unknown> | null;
    food_pairings?: string[] | null;
  } | {
    id: string;
    name: string;
    winery: string;
    wine_type: string;
    country?: string;
    region?: string;
    grapes?: string[];
    vivino_rating?: number;
    vivino_reviews?: number;
    alcohol?: number;
    tasting_notes?: { nose?: string[]; palate?: string[]; finish?: string } | null;
    ai_description?: string | null;
    image_url?: string;
    serving?: Record<string, unknown> | null;
    food_pairings?: string[] | null;
  }[] | null;
}

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const userId = user.id;
  let wishlistItems: WishlistItem[] = [];
  try {
    const { data } = await supabase
      .from('wishlist_items')
      .select(`
        id, priority, notes,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, vivino_reviews, alcohol, tasting_notes, ai_description, image_url, serving, food_pairings, taste_spectrum)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    wishlistItems = (data as WishlistItem[]) || [];
  } catch (e) {
    console.error('Wishlist page error:', e);
  }
  return <WishlistPage userId={userId} initialItems={wishlistItems} />;
}
