import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/cellar/cleanup?userId=...
 * Lists all cellar_items for the user so you can see duplicates / inflated quantities.
 *
 * DELETE /api/cellar/cleanup
 * Body: { userId, keepIds: ["<id-to-keep>", ...] }
 * Deletes every cellar_item for the user EXCEPT the ones listed in keepIds.
 */

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cellar_items')
      .select('id, quantity, wine_id, created_at, slot_id, wines(name, winery)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalQuantity = (data ?? []).reduce((s, i) => s + (i.quantity || 0), 0);

    return NextResponse.json({
      count: data?.length ?? 0,
      totalQuantity,
      items: data ?? [],
    });
  } catch (error) {
    console.error('Cellar cleanup GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch cellar items' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, keepIds } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!Array.isArray(keepIds)) {
      return NextResponse.json({ error: 'keepIds must be an array of cellar_item ids to keep' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: allItems, error: fetchErr } = await supabase
      .from('cellar_items')
      .select('id')
      .eq('user_id', userId);

    if (fetchErr) throw fetchErr;

    const keepSet = new Set(keepIds);
    const toDelete = (allItems ?? []).filter((i) => !keepSet.has(i.id)).map((i) => i.id);

    if (toDelete.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'Nothing to delete' });
    }

    const { error: delErr } = await supabase
      .from('cellar_items')
      .delete()
      .in('id', toDelete);

    if (delErr) throw delErr;

    return NextResponse.json({ deleted: toDelete.length, kept: keepIds.length });
  } catch (error) {
    console.error('Cellar cleanup DELETE error:', error);
    return NextResponse.json({ error: 'Failed to clean up cellar items' }, { status: 500 });
  }
}
