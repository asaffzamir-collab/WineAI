import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWineDiscovery } from '@/lib/sommelier-ai';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { fetchWineImagesForMany } from '@/lib/wine-image';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

interface DiscoveredWine {
  name: string;
  winery: string;
  region?: string;
  grape?: string;
  wine_type?: string;
  country?: string;
  match?: number;
  reason?: string;
  tasting_note?: string;
  image_url?: string;
  positive_matches?: string[];
  mismatches?: string[];
  wine_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};
    const likedWines: string[] = profiles?.flatMap(p => {
      const d = p.profile_data as Record<string, unknown>;
      return Array.isArray(d?.liked_wines) ? d.liked_wines as string[] : [];
    }) || [];

    const result = await generateWineDiscovery(combinedProfile, likedWines, lang) as {
      wines?: DiscoveredWine[];
    };

    const wines: DiscoveredWine[] = result?.wines || [];

    // Fetch images server-side for all discovered wines
    if (wines.length > 0) {
      const imgResults = await fetchWineImagesForMany(
        wines.map((w) => ({ name: w.name, winery: w.winery || '' })),
      );
      wines.forEach((w, i) => {
        const url = imgResults.get(`${i}`);
        if (url) w.image_url = url;
      });
    }

    incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
      if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
    }).catch(() => {});
    return NextResponse.json({ wines });
  } catch (error) {
    console.error('Discovery error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
