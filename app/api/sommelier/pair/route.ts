import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFoodPairing } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { meal } = await request.json();
    if (!meal) return NextResponse.json({ error: 'Meal required' }, { status: 400 });

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    const { data: cellarItems } = await supabase.from('cellar_items').select('*, wines(*)').eq('user_id', user.id);
    const cellarWines = cellarItems?.map(item => item.wines) || [];

    const result = await generateFoodPairing(meal, combinedProfile, cellarWines, lang);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pairing error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
