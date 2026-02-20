import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const admin = createAdminClient();
    const { data, error: dbError } = await admin
      .from('app_settings')
      .select('premium_enabled, updated_at')
      .limit(1)
      .single();

    if (dbError) throw dbError;
    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error('Admin settings GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.premium_enabled === 'boolean') {
      updates.premium_enabled = body.premium_enabled;
    }

    const admin = createAdminClient();
    const { data: current } = await admin
      .from('app_settings')
      .select('id')
      .limit(1)
      .single();

    if (!current) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    const { data, error: dbError } = await admin
      .from('app_settings')
      .update(updates)
      .eq('id', current.id)
      .select('premium_enabled, updated_at')
      .single();

    if (dbError) throw dbError;
    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error('Admin settings PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
