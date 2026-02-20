import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/changelog — public read (no admin required)
 * Returns all changelog entries ordered by date descending.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('changelog_entries')
      .select('id, version, date, title, title_he, highlights, created_at')
      .order('date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ entries: data || [] });
  } catch (err) {
    console.error('Changelog GET error:', err);
    return NextResponse.json({ entries: [] });
  }
}

/**
 * POST /api/admin/changelog — admin-only: create a new changelog entry
 */
export async function POST(request: Request) {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { version, date, title, title_he, highlights } = body;

    if (!version || !title) {
      return NextResponse.json({ error: 'version and title are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error: dbError } = await admin
      .from('changelog_entries')
      .insert({
        version,
        date: date || new Date().toISOString().split('T')[0],
        title,
        title_he: title_he || '',
        highlights: highlights || [],
      })
      .select('id, version, date, title, title_he, highlights')
      .single();

    if (dbError) throw dbError;
    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('Changelog POST error:', err);
    const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to create';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/changelog — admin-only: update an existing entry
 */
export async function PATCH(request: Request) {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const allowed: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.version != null) allowed.version = updates.version;
    if (updates.date != null) allowed.date = updates.date;
    if (updates.title != null) allowed.title = updates.title;
    if (updates.title_he != null) allowed.title_he = updates.title_he;
    if (updates.highlights != null) allowed.highlights = updates.highlights;

    const admin = createAdminClient();
    const { data, error: dbError } = await admin
      .from('changelog_entries')
      .update(allowed)
      .eq('id', id)
      .select('id, version, date, title, title_he, highlights')
      .single();

    if (dbError) throw dbError;
    return NextResponse.json({ entry: data });
  } catch (err) {
    console.error('Changelog PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/changelog?id=... — admin-only: delete an entry
 */
export async function DELETE(request: Request) {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const admin = createAdminClient();
    const { error: dbError } = await admin
      .from('changelog_entries')
      .delete()
      .eq('id', id);

    if (dbError) throw dbError;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Changelog DELETE error:', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
