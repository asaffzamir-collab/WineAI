import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/require-user';

/** Admin client for wine record updates (bypasses RLS). Falls back to null. */
function tryAdminClient() {
  try { return createAdminClient(); } catch { return null; }
}

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
    const { data, error } = await supabase
      .from('wishlist_items')
      .select(`
        id, priority, notes,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, vivino_reviews, alcohol, tasting_notes, ai_description, image_url, image_source, serving, food_pairings, taste_spectrum)
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
    const { error: authError } = await requireUser(userId);
    if (authError) return authError;
    const supabase = await createClient();

    const { data: existingWine } = await supabase.from('wines').select('id, image_url, serving, food_pairings, taste_spectrum, country, region, grapes, alcohol, wine_type').eq('name', wine.name).eq('winery', wine.winery).single();
    let wineId = existingWine?.id;
    if (wineId && existingWine) {
      const updates: Record<string, unknown> = {};
      const imgUrl = typeof wine.image_url === 'string' ? wine.image_url : null;
      if (imgUrl && !existingWine.image_url) updates.image_url = imgUrl;
      if (imgUrl && imgUrl.startsWith('data:')) updates.image_url = imgUrl;
      if (wine.serving && !existingWine.serving) updates.serving = wine.serving;
      if (wine.food_pairings && Array.isArray(wine.food_pairings) && wine.food_pairings.length > 0 && !existingWine.food_pairings) updates.food_pairings = wine.food_pairings;
      if (wine.vivino_rating != null) updates.vivino_rating = wine.vivino_rating;
      if (wine.tasting_notes) updates.tasting_notes = wine.tasting_notes;
      const aiDesc = wine.winery_description ?? wine.ai_description;
      if (aiDesc) updates.ai_description = aiDesc;
      if (wine.taste_spectrum && !existingWine.taste_spectrum) updates.taste_spectrum = wine.taste_spectrum;
      if (wine.country && !existingWine.country) updates.country = wine.country;
      if (wine.region && !existingWine.region) updates.region = wine.region;
      if (wine.grapes?.length && !existingWine.grapes?.length) updates.grapes = wine.grapes;
      if (wine.alcohol != null && !existingWine.alcohol) updates.alcohol = wine.alcohol;
      if (wine.wine_type && !existingWine.wine_type) updates.wine_type = wine.wine_type;
      if (Object.keys(updates).length > 0) {
        const admin = tryAdminClient();
        const client = admin ?? supabase;
        await client.from('wines').update(updates).eq('id', wineId);
      }
    } else {
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
        ai_description: wine.winery_description ?? wine.ai_description,
        image_url: wine.image_url ?? null,
        serving: wine.serving ?? null,
        food_pairings: Array.isArray(wine.food_pairings) ? wine.food_pairings : null,
        taste_spectrum: wine.taste_spectrum ?? null,
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
    const { error: authError } = await requireUser();
    if (authError) return authError;
    const supabase = await createClient();
    const { error } = await supabase.from('wishlist_items').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Wishlist delete error:', error);
    return NextResponse.json({ error: 'Failed to delete from wishlist' }, { status: 500 });
  }
}
