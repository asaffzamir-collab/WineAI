import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRefinementChoices, processRefinementChoice } from '@/lib/sommelier-ai';
import { requireUsage } from '@/lib/require-usage';
import { incrementUsage } from '@/lib/usage';
import { notifyAdminUsageThreshold } from '@/lib/notify-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const usageBlock = await requireUsage(user.id, 'pier_message');
    if (usageBlock) return usageBlock;

    const { action, choice } = await request.json();
    const { data: userProfile } = await supabase.from('user_profiles').select('preferred_language').eq('id', user.id).single();
    const lang = userProfile?.preferred_language || 'he';

    const { data: profiles } = await supabase.from('taste_profiles').select('*').eq('user_id', user.id);
    const combinedProfile = profiles?.reduce((acc, p) => ({ ...acc, ...(p.profile_data as object) }), {}) || {};

    if (action === 'generate') {
      const result = await generateRefinementChoices(combinedProfile, lang);
      incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
        if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
      }).catch(() => {});
      return NextResponse.json(result);
    }

    if (action === 'choose' && choice) {
      const result = await processRefinementChoice(combinedProfile, choice, lang) as Record<string, unknown>;
      const profileUpdates = result.profile_updates as Record<string, unknown> | undefined;

      if (profileUpdates && profiles && profiles.length > 0) {
        for (const tp of profiles) {
          const existingData = (tp.profile_data as Record<string, unknown>) || {};
          const merged: Record<string, unknown> = { ...existingData };

          if (profileUpdates.overall_style) merged.overall_style = profileUpdates.overall_style;
          if (profileUpdates.body_structure) merged.body_structure = profileUpdates.body_structure;
          if (profileUpdates.style_notes) merged.style_notes = profileUpdates.style_notes;
          if (profileUpdates.taste_spectrum) merged.taste_spectrum = profileUpdates.taste_spectrum;
          if (Array.isArray(profileUpdates.recommended_grapes) && profileUpdates.recommended_grapes.length > 0) {
            merged.recommended_grapes = profileUpdates.recommended_grapes;
          }
          if (Array.isArray(profileUpdates.recommended_regions) && profileUpdates.recommended_regions.length > 0) {
            merged.recommended_regions = profileUpdates.recommended_regions;
          }

          await supabase.from('taste_profiles').update({
            profile_data: merged,
            updated_at: new Date().toISOString(),
          }).eq('user_id', user.id).eq('wine_type', tp.wine_type);
        }
      }

      await supabase.from('sommelier_profiles').update({
        last_interaction: new Date().toISOString(),
        taste_precision: Math.min((combinedProfile as { taste_precision?: number }).taste_precision ?? 30, 95) + 5,
      }).eq('user_id', user.id);

      incrementUsage(user.id, 'pier_message').then(({ thresholdHit }) => {
        if (thresholdHit) notifyAdminUsageThreshold(user.id, 'pier_message', thresholdHit);
      }).catch(() => {});
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Refine error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
