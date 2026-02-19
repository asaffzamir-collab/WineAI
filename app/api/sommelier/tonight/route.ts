import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTonightRecommendation } from '@/lib/sommelier-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { occasion, food, mood } = await request.json();
    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    const { data: cellarItems } = await supabase.from('cellar_items').select('*, wines(*)').eq('user_id', user.id);
    const cellarWines = cellarItems?.map(item => ({
      ...item.wines,
      quantity: item.quantity,
      drink_from: item.drink_from,
      drink_until: item.drink_until,
      cellar_item_id: item.id,
    })) || [];

    const result = await generateTonightRecommendation({ occasion, food, mood }, cellarWines, combinedProfile, lang);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Tonight error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
