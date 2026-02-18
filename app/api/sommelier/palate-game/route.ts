import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePalateGame, processPalateGameChoice } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { action, wineId } = await request.json();
    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    if (action === 'generate') {
      const result = await generatePalateGame(combinedProfile, lang);
      return NextResponse.json(result);
    }

    if (action === 'choose' && wineId) {
      const result = await processPalateGameChoice(combinedProfile, wineId, [], lang);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Palate game error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
