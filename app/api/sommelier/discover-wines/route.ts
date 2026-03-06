import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateWineDiscovery } from '@/lib/sommelier-ai';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';
import { fetchWineImagesForMany } from '@/lib/wine-image';
import { enrichWines, type MinimalWine } from '@/lib/enrich-wines';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    let result: { wines?: MinimalWine[] };
    try {
      result = await generateWineDiscovery(combinedProfile, likedWines, lang) as { wines?: MinimalWine[] };
    } catch (aiErr) {
      console.error('Wine discovery AI error:', aiErr);
      return NextResponse.json({ wines: [], error: 'Discovery AI temporarily unavailable' }, { status: 200 });
    }

    const rawWines: MinimalWine[] = result?.wines || [];
    const wines = rawWines.length > 0
      ? await enrichWines(rawWines, typedProfiles, { language: lang })
      : [];

    const winesMissingImages = wines.filter((w) => !w.image_url);
    if (winesMissingImages.length > 0) {
      try {
        const imgResults = await fetchWineImagesForMany(
          winesMissingImages.map((w) => ({ name: w.name, winery: w.winery || '' })),
        );
        winesMissingImages.forEach((w, i) => {
          const r = imgResults.get(`${i}`);
          if (r) w.image_url = r.url;
        });
      } catch { /* image fetch is best-effort */ }
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
