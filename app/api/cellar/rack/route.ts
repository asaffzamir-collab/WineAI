import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isTableMissing(error: unknown): boolean {
  const msg = String(error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : error);
  return (msg.includes('cellar_racks') || msg.includes('relation')) &&
    (msg.includes('does not exist') || msg.includes('not found') || msg.includes('schema cache'));
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cellar_racks')
      .select('id, config, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      if (isTableMissing(error)) {
        console.warn('[cellar_racks] Table does not exist. Run migrations via POST /api/ensure-schema');
        return NextResponse.json({ racks: [], tableMissing: true });
      }
      throw error;
    }
    return NextResponse.json({ racks: data || [] });
  } catch (error) {
    console.error('Rack GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch racks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, config } = await request.json();
    if (!userId || !config) {
      return NextResponse.json({ error: 'userId and config required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cellar_racks')
      .insert({ user_id: userId, config })
      .select('id')
      .single();

    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({ error: 'table_missing' }, { status: 503 });
      }
      throw error;
    }
    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Rack POST error:', error);
    return NextResponse.json({ error: 'Failed to create rack' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, config } = await request.json();
    if (!id || !config) {
      return NextResponse.json({ error: 'id and config required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from('cellar_racks')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({ error: 'table_missing' }, { status: 503 });
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rack PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update rack' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from('cellar_racks').delete().eq('id', id);
    if (error) {
      if (isTableMissing(error)) {
        return NextResponse.json({ error: 'table_missing' }, { status: 503 });
      }
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rack DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete rack' }, { status: 500 });
  }
}
