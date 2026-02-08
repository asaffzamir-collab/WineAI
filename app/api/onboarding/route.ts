import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userId, answers } = await request.json();
    if (!userId || !answers) {
      return NextResponse.json({ error: 'userId and answers required' }, { status: 400 });
    }
    const supabase = createAdminClient();

    const { generateTasteProfile } = await import('@/lib/openai');
    const profiles = await generateTasteProfile(answers);
    if (!profiles) {
      return NextResponse.json({ error: 'Failed to generate taste profile' }, { status: 500 });
    }

    const wineTypes = ['red', 'white', 'rose'] as const;
    for (const wineType of wineTypes) {
      if (profiles[wineType]) {
        await supabase.from('taste_profiles').upsert({
          user_id: userId,
          wine_type: wineType,
          profile_data: profiles[wineType],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,wine_type' });
      }
    }
    await supabase.from('user_profiles').update({ onboarding_completed: true }).eq('id', userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}
