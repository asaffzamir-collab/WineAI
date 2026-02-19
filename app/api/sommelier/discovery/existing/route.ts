import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: sommelierProfile } = await supabase
      .from('sommelier_profiles')
      .select('discovery_data')
      .eq('user_id', user.id)
      .single();

    if (!sommelierProfile?.discovery_data) {
      return NextResponse.json({ profile: null });
    }

    const discoveryData = sommelierProfile.discovery_data as Record<string, unknown>;
    const profile = discoveryData.preliminary_profile ?? null;

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Fetch existing discovery error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
