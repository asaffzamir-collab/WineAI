import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userId, answers } = await request.json();
    if (!userId || !answers) {
      return NextResponse.json({ error: 'userId and answers required' }, { status: 400 });
    }
    const supabase = await createClient();

    // Determine locale and user name from user profile
    const cookieStore = await cookies();
    let locale = cookieStore.get('locale')?.value || 'he';
    let userName: string | undefined;
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('preferred_language, first_name')
        .eq('id', userId)
        .single();
      if (userProfile?.preferred_language) {
        locale = userProfile.preferred_language;
      }
      if (userProfile?.first_name) {
        userName = userProfile.first_name;
      }
    } catch { /* use cookie locale */ }

    const { generateTasteProfile } = await import('@/lib/openai');
    const profiles = await generateTasteProfile(answers, locale, userName);
    if (!profiles) {
      return NextResponse.json({ error: 'Failed to generate taste profile' }, { status: 500 });
    }

    const wineTypes = ['red', 'white', 'rose'] as const;
    for (const wineType of wineTypes) {
      if (profiles[wineType]) {
        // Mark as originating from onboarding so matching logic knows this profile has real context
        const profileData = { ...profiles[wineType], from_onboarding: true };
        await supabase.from('taste_profiles').upsert({
          user_id: userId,
          wine_type: wineType,
          profile_data: profileData,
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
