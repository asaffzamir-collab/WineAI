import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type LikedWineEntry = { name: string; winery: string; [key: string]: unknown };

function removeWineFromProfileData(
  profileData: Record<string, unknown>,
  name: string,
  winery: string
): Record<string, unknown> {
  const detail = (profileData.liked_wines_detail as LikedWineEntry[] | undefined) || [];
  const filtered = detail.filter(
    (w) => String(w.name).trim() !== String(name).trim() || String(w.winery).trim() !== String(winery).trim()
  );
  const names = filtered.map((w) => w.name).filter(Boolean);

  if (filtered.length === 0) {
    return {};
  }

  return {
    ...profileData,
    liked_wines_detail: filtered,
    liked_wines: names,
  };
}

export async function POST(request: Request) {
  let body: { userId?: string; wine?: { name?: string; winery?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { userId, wine } = body || {};
  if (!userId || !wine || typeof wine !== 'object' || !wine.name || !wine.winery) {
    return NextResponse.json(
      { error: 'userId and wine (with name and winery) required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const name = String(wine.name).trim();
  const winery = String(wine.winery).trim();
  if (!name || !winery) {
    return NextResponse.json({ error: 'Wine name and winery are required' }, { status: 400 });
  }

  try {
    const { data: profiles } = await supabase
      .from('taste_profiles')
      .select('wine_type, profile_data')
      .eq('user_id', userId);

    const profilesList = profiles || [];
    let updated = false;
    let profileWineType: string | null = null;
    let newProfileData: Record<string, unknown> | null = null;

    for (const row of profilesList) {
      const detail = (row.profile_data as Record<string, unknown>)?.liked_wines_detail as LikedWineEntry[] | undefined;
      if (!Array.isArray(detail)) continue;
      const hasWine = detail.some(
        (w) => String(w.name).trim() === name && String(w.winery).trim() === winery
      );
      if (!hasWine) continue;

      profileWineType = row.wine_type;
      newProfileData = removeWineFromProfileData(
        (row.profile_data as Record<string, unknown>) || {},
        name,
        winery
      );
      updated = true;
      break;
    }

    if (!updated || !profileWineType) {
      return NextResponse.json(
        { error: 'Wine not found in your taste profile' },
        { status: 404 }
      );
    }

    const { error: profileError } = await supabase
      .from('taste_profiles')
      .update({
        profile_data: newProfileData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('wine_type', profileWineType);

    if (profileError) {
      console.error('Profile remove-wine update error:', profileError.message);
      return NextResponse.json(
        { error: 'Failed to update profile', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove wine from profile error:', error);
    return NextResponse.json(
      { error: 'Failed to remove wine from profile' },
      { status: 500 }
    );
  }
}
