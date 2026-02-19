import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SommelierState, SommelierPhase } from '@/lib/sommelier-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: sommelierProfile } = await supabase
      .from('sommelier_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: tasteProfiles } = await supabase
      .from('taste_profiles')
      .select('profile_data')
      .eq('user_id', user.id);

    let likedWinesCount = 0;
    if (tasteProfiles) {
      for (const tp of tasteProfiles) {
        const data = tp.profile_data as Record<string, unknown> | null;
        if (data && Array.isArray(data.liked_wines)) {
          likedWinesCount += data.liked_wines.length;
        }
      }
    }

    let phase: SommelierPhase = 'discovery';
    let precision = 0;
    const hasDiscoveryData = !!sommelierProfile?.discovery_data && Object.keys(sommelierProfile.discovery_data as object).length > 0;

    // Compute max unlocked phase based on actual profile progress
    let maxUnlockedPhase: SommelierPhase = 'discovery';
    if (likedWinesCount >= 2) {
      maxUnlockedPhase = 'personalization';
    } else if (likedWinesCount >= 1 || hasDiscoveryData) {
      maxUnlockedPhase = 'learning';
    }

    if (sommelierProfile) {
      phase = sommelierProfile.phase as SommelierPhase;
      precision = sommelierProfile.taste_precision ?? 0;
    } else if (likedWinesCount >= 2) {
      phase = 'personalization';
      precision = Math.min(40 + likedWinesCount * 10, 95);
    } else if (likedWinesCount === 1) {
      phase = 'learning';
      precision = 30;
    }

    const state: SommelierState = {
      phase,
      maxUnlockedPhase,
      precision,
      hasDiscoveryData,
      likedWinesCount,
      conversationHistory: (sommelierProfile?.conversation_history as unknown[]) as SommelierState['conversationHistory'] || [],
    };

    return NextResponse.json(state);
  } catch (error) {
    console.error('Error fetching sommelier state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
