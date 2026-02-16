import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        id, priority, notes,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error('Wishlist GET error:', error);
    return NextResponse.json({ error: 'Failed to load wishlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, wine, priority, notes } = await request.json();
    if (!userId || !wine?.name || !wine?.winery) {
      return NextResponse.json({ error: 'userId and wine (name, winery) required' }, { status: 400 });
    }
    const supabase = await createClient();

    let { data: existingWine } = await supabase.from('wines').select('id').eq('name', wine.name).eq('winery', wine.winery).single();
    let wineId = existingWine?.id;
    if (!wineId) {
      const { data: newWine, error: wineError } = await supabase.from('wines').insert({
        name: wine.name,
        winery: wine.winery,
        vivino_rating: wine.vivino_rating,
        vivino_reviews: wine.vivino_reviews,
        country: wine.country,
        region: wine.region,
        grapes: wine.grapes,
        alcohol: wine.alcohol,
        wine_type: wine.wine_type,
        tasting_notes: wine.tasting_notes,
        ai_description: wine.winery_description,
      }).select('id').single();
      if (wineError) throw wineError;
      wineId = newWine.id;
    }
    const { error: wishlistError } = await supabase.from('wishlist_items').insert({
      user_id: userId,
      wine_id: wineId,
      priority: priority || 1,
      notes,
    });
    if (wishlistError) throw wishlistError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wishlist add error:', error);
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wishlist delete error:', error);
    return NextResponse.json({ error: 'Failed to delete from wishlist' }, { status: 500 });
  }
}
