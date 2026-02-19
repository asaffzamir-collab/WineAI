import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SommelierPhase } from '@/lib/sommelier-types';

export const dynamic = 'force-dynamic';

const VALID_PHASES: SommelierPhase[] = ['discovery', 'learning', 'personalization'];

export async function POST(request: Request) {
  try {
    const { phase } = (await request.json()) as { phase?: string };
    if (!phase || !VALID_PHASES.includes(phase as SommelierPhase)) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error } = await supabase
      .from('sommelier_profiles')
      .upsert(
        {
          user_id: user.id,
          phase,
          last_interaction: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) throw error;

    return NextResponse.json({ success: true, phase });
  } catch (error) {
    console.error('Set phase error:', error);
    return NextResponse.json({ error: 'Failed to update phase' }, { status: 500 });
  }
}
