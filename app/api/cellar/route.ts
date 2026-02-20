import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** Admin client for wine record updates (bypasses RLS). Falls back to null. */
function tryAdminClient() {
  try { return createAdminClient(); } catch { return null; }
}

export const dynamic = 'force-dynamic';

const CELLAR_SELECT_FULL = `
  id, quantity, purchase_price, purchase_date, notes,
  drink_from, drink_until, slot_id,
  wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
`;

const CELLAR_SELECT_NO_SLOT = `
  id, quantity, purchase_price, purchase_date, notes,
  drink_from, drink_until,
  wines (id, name, winery, wine_type, country, region, grapes, vivino_rating, image_url)
`;

function isColumnMissing(err: unknown): boolean {
  const msg = String(err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : err);
  return msg.includes('slot_id') && (msg.includes('does not exist') || msg.includes('not found'));
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const supabase = await createClient();
    let { data, error } = await supabase
      .from('cellar_items')
      .select(CELLAR_SELECT_FULL)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error && isColumnMissing(error)) {
      const fallback = await supabase
        .from('cellar_items')
        .select(CELLAR_SELECT_NO_SLOT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      data = fallback.data as typeof data;
      error = fallback.error;
    }
    if (error) throw error;
    const resp = NextResponse.json({ items: data || [] });
    resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return resp;
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
    image_url: (typeof wine.image_url === 'string' ? wine.image_url : null) as string | null,
    serving: wine.serving ?? null,
    food_pairings: Array.isArray(wine.food_pairings) ? wine.food_pairings : null,
  };
}

export async function POST(request: Request) {
  try {
    const { userId, wine, quantity, purchasePrice, purchaseDate, storageLocation, notes, bottlePhotoUrl, slotId } = await request.json();
    if (!userId || !wine?.name || !wine?.winery) {
      return NextResponse.json({ error: 'Missing userId or wine name and winery' }, { status: 400 });
    }
    const supabase = await createClient();
    const wineRow = normalizeWineForDb(wine);

    const { data: existingWine } = await supabase.from('wines').select('id, image_url, serving, food_pairings').eq('name', wineRow.name).eq('winery', wineRow.winery).single();
    let wineId = existingWine?.id;
    if (wineId && existingWine) {
      // Update existing wine with latest data (image_url, serving, food_pairings, etc.)
      // Uses admin client to bypass RLS (wines table has no UPDATE policy by default)
      const updates: Record<string, unknown> = {};
      const imgUrl = wineRow.image_url;
      if (imgUrl && !existingWine.image_url) updates.image_url = imgUrl;
      if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('data:')) updates.image_url = imgUrl;
      if (wineRow.serving && !existingWine.serving) updates.serving = wineRow.serving;
      if (wineRow.food_pairings && !existingWine.food_pairings) updates.food_pairings = wineRow.food_pairings;
      if (wineRow.vivino_rating != null) updates.vivino_rating = wineRow.vivino_rating;
      if (wineRow.tasting_notes) updates.tasting_notes = wineRow.tasting_notes;
      if (wineRow.ai_description) updates.ai_description = wineRow.ai_description;
      if (Object.keys(updates).length > 0) {
        const admin = tryAdminClient();
        const client = admin ?? supabase;
        await client.from('wines').update(updates).eq('id', wineId);
      }
    } else {
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
    if (bottlePhotoUrl) cellarRow.bottle_photo_url = bottlePhotoUrl;
    if (slotId) cellarRow.slot_id = slotId;

    let cellarResult = await supabase.from('cellar_items').insert(cellarRow).select('id').single();
    if (cellarResult.error) {
      const msg = cellarResult.error.message ?? '';
      const badCols: string[] = [];
      if (msg.includes('bottle_photo_url')) badCols.push('bottle_photo_url');
      if (msg.includes('slot_id')) badCols.push('slot_id');
      if (badCols.length > 0) {
        for (const col of badCols) delete cellarRow[col];
        cellarResult = await supabase.from('cellar_items').insert(cellarRow).select('id').single();
      }
    }
    if (cellarResult.error) throw cellarResult.error;
    return NextResponse.json({ success: true, cellarItemId: cellarResult.data?.id });
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
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const supabase = await createClient();

    // Build update object from allowed fields
    const updates: Record<string, unknown> = {};
    if ('bottlePhotoUrl' in body) updates.bottle_photo_url = body.bottlePhotoUrl ?? null;
    if ('purchasePrice' in body) updates.purchase_price = body.purchasePrice ?? null;
    if ('quantity' in body) updates.quantity = Math.max(1, Math.floor(Number(body.quantity)) || 1);
    if ('notes' in body) updates.notes = body.notes ?? null;
    if ('storageLocation' in body) updates.storage_location = body.storageLocation ?? null;
    if ('purchaseDate' in body) updates.purchase_date = body.purchaseDate ?? null;
    if ('slotId' in body) updates.slot_id = body.slotId ?? null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    let { error } = await supabase.from('cellar_items').update(updates).eq('id', id);
    if (error) {
      const msg = error.message ?? '';
      const badCols: string[] = [];
      if (msg.includes('bottle_photo_url') && 'bottle_photo_url' in updates) badCols.push('bottle_photo_url');
      if (msg.includes('slot_id') && 'slot_id' in updates) badCols.push('slot_id');
      if (badCols.length > 0) {
        for (const col of badCols) delete updates[col];
        if (Object.keys(updates).length > 0) {
          ({ error } = await supabase.from('cellar_items').update(updates).eq('id', id));
        } else {
          error = null;
          console.warn('PATCH: columns not available in DB:', badCols.join(', '));
        }
      }
    }
    if (error) throw error;
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
