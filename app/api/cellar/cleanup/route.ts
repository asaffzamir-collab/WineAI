import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/cellar/cleanup
 * Lists all cellar_items for the authenticated user.
 *
 * POST /api/cellar/cleanup
 * Body: { keepNewest: number }
 * Keeps only the N most recent cellar items, deletes the rest.
 */

async function getSessionUserId() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, userId: session?.user?.id ?? null };
}

export async function GET() {
  try {
    const { supabase, userId } = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('cellar_items')
      .select('id, quantity, wine_id, created_at, slot_id, wines(name, winery)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalQuantity = (data ?? []).reduce((s, i) => s + (i.quantity || 0), 0);

    return NextResponse.json({
      userId,
      count: data?.length ?? 0,
      totalQuantity,
      items: data ?? [],
    });
  } catch (error) {
    console.error('Cellar cleanup GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch cellar items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const keepNewest = typeof body.keepNewest === 'number' ? body.keepNewest : null;
    const keepIds: string[] = Array.isArray(body.keepIds) ? body.keepIds : [];

    if (keepNewest == null && keepIds.length === 0) {
      return NextResponse.json(
        { error: 'Provide keepNewest (number) or keepIds (array of IDs to keep)' },
        { status: 400 },
      );
    }

    const { data: allItems, error: fetchErr } = await supabase
      .from('cellar_items')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;
    const items = allItems ?? [];

    let idsToKeep: Set<string>;
    if (keepNewest != null) {
      idsToKeep = new Set(items.slice(0, keepNewest).map((i) => i.id));
    } else {
      idsToKeep = new Set(keepIds);
    }

    const toDelete = items.filter((i) => !idsToKeep.has(i.id)).map((i) => i.id);

    if (toDelete.length === 0) {
      return NextResponse.json({ deleted: 0, kept: idsToKeep.size, message: 'Nothing to delete' });
    }

    const BATCH = 100;
    let totalDeleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH) {
      const batch = toDelete.slice(i, i + BATCH);
      const { error: delErr } = await supabase
        .from('cellar_items')
        .delete()
        .in('id', batch);
      if (delErr) throw delErr;
      totalDeleted += batch.length;
    }

    return NextResponse.json({ deleted: totalDeleted, kept: idsToKeep.size });
  } catch (error) {
    console.error('Cellar cleanup POST error:', error);
    return NextResponse.json({ error: 'Failed to clean up cellar items' }, { status: 500 });
  }
}
