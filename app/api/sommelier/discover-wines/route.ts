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
  profile_spectrum?: { body: number; tannin: number; sweetness: number; acidity: number };
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

    const { data: profiles } = await supabase.from('taste_profiles').select('profile_data, wine_type').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};
    const typedProfiles = profiles?.reduce((acc, p) => {
      if (p.wine_type) acc[p.wine_type] = p.profile_data;
      return acc;
    }, {} as Record<string, unknown>) || {};
    const likedWines: string[] = profiles?.flatMap(p => {
      const d = p.profile_data as Record<string, unknown>;
      return Array.isArray(d?.liked_wines) ? d.liked_wines as string[] : [];
    }) || [];

    let result: { wines?: DiscoveredWine[] };
    try {
      result = await generateWineDiscovery(combinedProfile, likedWines, lang) as { wines?: DiscoveredWine[] };
    } catch (aiErr) {
      console.error('Wine discovery AI error:', aiErr);
      return NextResponse.json({ wines: [], error: 'Discovery AI temporarily unavailable' }, { status: 200 });
    }

    const wines: DiscoveredWine[] = result?.wines || [];

    const hasProfile = Object.keys(typedProfiles).length > 0;
    if (hasProfile && wines.length > 0) {
      const { quickMatchScore } = await import('@/lib/openai');
      for (const w of wines) {
        const wt = w.wine_type || 'red';
        const pk = wt === 'sparkling' || wt === 'dessert' ? 'white' : wt;
        const rp = (typedProfiles[pk] || typedProfiles.red || {}) as Record<string, unknown>;
        try {
          const score = quickMatchScore(
            { name: w.name, winery: w.winery || '', wine_type: w.wine_type, grapes: w.grape ? w.grape.split(',').map(g => g.trim()) : [], region: w.region, country: w.country },
            w.wine_spectrum,
            rp,
          );
          if (score !== null) w.match = score;
          const ps = rp.taste_spectrum as { body: number; tannin: number; sweetness: number; acidity: number } | undefined;
          if (ps && typeof ps.body === 'number') w.profile_spectrum = ps;
        } catch {
          // scoring is best-effort
        }
      }
    }

    if (wines.length > 0) {
      try {
        const imgResults = await fetchWineImagesForMany(
          wines.map((w) => ({ name: w.name, winery: w.winery || '' })),
        );
        wines.forEach((w, i) => {
          const r = imgResults.get(`${i}`);
          if (r) w.image_url = r.url;
        });
      } catch {
        // image fetch is best-effort
      }
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
