import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/profile/backfill-spectrum
 * For profiles that were created before taste_spectrum was added,
 * ask the AI to generate spectrum values from the existing text profile.
 */
export async function POST(request: Request) {
  let body: { userId?: string; wineType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, wineType } = body;
  if (!userId || !wineType) {
    return NextResponse.json({ error: 'userId and wineType required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: profile, error: fetchError } = await supabase
      .from('taste_profiles')
      .select('profile_data')
      .eq('user_id', userId)
      .eq('wine_type', wineType)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile.profile_data as Record<string, unknown>;

    const existingSpectrum = profileData.taste_spectrum as Record<string, unknown> | undefined;
    const isCalibrated = existingSpectrum && (existingSpectrum as Record<string, unknown>).calibrated === true;

    // Only skip regeneration if spectrum exists AND was generated with calibrated anchors
    if (isCalibrated) {
      return NextResponse.json({ spectrum: profileData.taste_spectrum, already_exists: true });
    }

    const { generateSpectrumFromProfile } = await import('@/lib/openai');
    const spectrum = await generateSpectrumFromProfile(profileData, wineType);

    if (!spectrum) {
      return NextResponse.json({ error: 'Failed to generate spectrum' }, { status: 500 });
    }

    // Mark as calibrated so we don't regenerate again
    profileData.taste_spectrum = { ...spectrum, calibrated: true };

    const { error: updateError } = await supabase
      .from('taste_profiles')
      .update({ profile_data: profileData, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('wine_type', wineType);

    if (updateError) {
      console.error('Spectrum backfill update error:', updateError.message);
      return NextResponse.json({ error: 'Failed to save spectrum' }, { status: 500 });
    }

    return NextResponse.json({ spectrum, backfilled: true });
  } catch (error) {
    console.error('Backfill spectrum error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
