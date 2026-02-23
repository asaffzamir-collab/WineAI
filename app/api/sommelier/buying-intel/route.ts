import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBuyingIntelligence } from '@/lib/sommelier-ai';
import { requirePremium } from '@/lib/require-premium';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const premiumBlock = await requirePremium(user.id, 'buying_intelligence');
    if (premiumBlock) return premiumBlock;

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

    const { wine_query } = await request.json();
    if (!wine_query) return NextResponse.json({ error: 'Wine query required' }, { status: 400 });

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    const { data: cellarItems } = await supabase.from('cellar_items').select('*, wines(*)').eq('user_id', user.id);
    const cellarWines = cellarItems?.map(item => item.wines) || [];

    const result = await generateBuyingIntelligence(wine_query, combinedProfile, cellarWines, lang);
    incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
      if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
    }).catch(() => {});
    return NextResponse.json(result);
  } catch (error) {
    console.error('Buying intel error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
