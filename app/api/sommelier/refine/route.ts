import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRefinementChoices, processRefinementChoice } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { action, choice } = await request.json();
    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    if (action === 'generate') {
      const result = await generateRefinementChoices(combinedProfile, lang);
      return NextResponse.json(result);
    }

    if (action === 'choose' && choice) {
      const result = await processRefinementChoice(combinedProfile, choice, lang);
      await supabase.from('sommelier_profiles').update({ last_interaction: new Date().toISOString() }).eq('user_id', user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Refine error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
