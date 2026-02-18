import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adjustDiscoveryProfile } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { feedback, currentProfile, discoveryData } = await request.json();
    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const profile = await adjustDiscoveryProfile(currentProfile || {}, feedback, discoveryData || {}, lang);

    await supabase.from('sommelier_profiles').update({
      discovery_data: { ...discoveryData, preliminary_profile: profile, feedback_loop: feedback },
      last_interaction: new Date().toISOString(),
    }).eq('user_id', user.id);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to adjust profile' }, { status: 500 });
  }
}
