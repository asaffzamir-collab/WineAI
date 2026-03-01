import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase
      .from('wine_match_cache')
      .delete()
      .eq('user_id', userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Wine match invalidation error:', error);
    return NextResponse.json({ error: 'Invalidation failed' }, { status: 500 });
  }
}
