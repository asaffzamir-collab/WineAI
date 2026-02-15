import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: profiles, error } = await supabase
      .from('taste_profiles')
      .select('wine_type, profile_data, updated_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Profile fetch error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const resp = NextResponse.json(profiles || []);
    resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return resp;
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
