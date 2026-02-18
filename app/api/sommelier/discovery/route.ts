import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDiscoveryProfile } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const profile = await generateDiscoveryProfile(body, lang);

    await supabase.from('sommelier_profiles').upsert({
      user_id: user.id,
      phase: 'discovery',
      discovery_data: { ...body, preliminary_profile: profile },
      taste_precision: 20,
      last_interaction: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Discovery error:', error);
    return NextResponse.json({ error: 'Failed to generate profile' }, { status: 500 });
  }
}
