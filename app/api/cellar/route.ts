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
    // Try with bottle_photo_url first; if the column doesn't exist, retry without it
    let { data, error } = await supabase
      .from('cellar_items')
      .select(`
        id, quantity, purchase_price, purchase_date, storage_location, notes, bottle_photo_url,
        wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error && error.message?.includes('bottle_photo_url')) {
      const retry = await supabase
        .from('cellar_items')
        .select(`
          id, quantity, purchase_price, purchase_date, storage_location, notes,
          wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      data = retry.data as typeof data;
      error = retry.error;
    }
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error('Cellar GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch cellar items' }, { status: 500 });
  }
}

function normalizeWineForDb(wine: Record<string, unknown>) {
  const wineType = wine.wine_type;
  const normalizedType =
    typeof wineType === 'string'
      ? (wineType.toLowerCase() as 'red' | 'white' | 'rose' | 'sparkling' | 'dessert')
      : undefined;
  const validTypes = ['red', 'white', 'rose', 'sparkling', 'dessert'];
  const safeWineType = normalizedType && validTypes.includes(normalizedType) ? normalizedType : 'red';
  const grapes = wine.grapes;
  const grapesArray = Array.isArray(grapes)
    ? grapes.map((g) => (typeof g === 'string' ? g : String(g)))
    : typeof grapes === 'string' ? [grapes] : [];
  return {
    name: wine.name,
    winery: wine.winery,
    vivino_rating: wine.vivino_rating ?? null,
    vivino_reviews: wine.vivino_reviews ?? null,
    country: wine.country ?? null,
    region: wine.region ?? null,
    grapes: grapesArray,
    alcohol: wine.alcohol ?? null,
    wine_type: safeWineType,
    tasting_notes: wine.tasting_notes ?? null,
    ai_description: wine.winery_description ?? wine.ai_description ?? null,
    image_url: wine.image_url ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const { userId, wine, quantity, purchasePrice, purchaseDate, storageLocation, notes, bottlePhotoUrl } = await request.json();
    if (!userId || !wine?.name || !wine?.winery) {
      return NextResponse.json({ error: 'Missing userId or wine name and winery' }, { status: 400 });
    }
    const supabase = await createClient();
    const wineRow = normalizeWineForDb(wine);

    let { data: existingWine } = await supabase.from('wines').select('id').eq('name', wineRow.name).eq('winery', wineRow.winery).single();
    let wineId = existingWine?.id;
    if (!wineId) {
      const { data: newWine, error: wineError } = await supabase.from('wines').insert(wineRow).select('id').single();
      if (wineError) throw wineError;
      wineId = newWine.id;
    }
    // Build cellar insert — bottle_photo_url is optional (column may not exist if migration wasn't run)
    const cellarRow: Record<string, unknown> = {
      user_id: userId,
      wine_id: wineId,
      quantity: quantity || 1,
      purchase_price: purchasePrice,
      purchase_date: purchaseDate,
      storage_location: storageLocation,
      notes,
    };
    // Try with bottle_photo_url first; if the column doesn't exist, retry without it
    if (bottlePhotoUrl) {
      cellarRow.bottle_photo_url = bottlePhotoUrl;
    }
    let { error: cellarError } = await supabase.from('cellar_items').insert(cellarRow);
    if (cellarError && cellarError.message?.includes('bottle_photo_url')) {
      // Column doesn't exist — retry without it
      delete cellarRow.bottle_photo_url;
      const retry = await supabase.from('cellar_items').insert(cellarRow);
      cellarError = retry.error;
    }
    if (cellarError) throw cellarError;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Cellar add error:', error);
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Failed to add to cellar';
    const isFk = typeof message === 'string' && (message.includes('foreign key') || message.includes('violates foreign key'));
    const userMessage = isFk ? 'Run the SQL in supabase/migrations/20260206200000_allow_mock_user_cellar_wishlist.sql in Supabase SQL Editor.' : message;
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, bottlePhotoUrl } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from('cellar_items').update({ bottle_photo_url: bottlePhotoUrl ?? null }).eq('id', id);
    // Silently ignore if the column doesn't exist
    if (error && !error.message?.includes('bottle_photo_url')) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cellar PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update cellar item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from('cellar_items').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cellar delete error:', error);
    return NextResponse.json({ error: 'Failed to delete from cellar' }, { status: 500 });
  }
}
