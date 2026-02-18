import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTasteEvolutionInsight } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data, updated_at').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    const evolutionData = profiles?.map(p => {
      const d = p.profile_data as Record<string, unknown>;
      const spectrum = d?.taste_spectrum as Record<string, number> | undefined;
      return { date: p.updated_at, ...(spectrum || {}) } as Record<string, unknown>;
    }).filter(e => e.body !== undefined) || [];

    if (evolutionData.length === 0) {
      return NextResponse.json({ current: { body: 50, tannin: 50, sweetness: 20, acidity: 50 }, insight: '', trends: [] });
    }

    const result = await generateTasteEvolutionInsight(evolutionData, combinedProfile, lang);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Evolution error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
