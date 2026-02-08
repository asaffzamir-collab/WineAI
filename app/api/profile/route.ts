import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getProfilesFromStorage } from '@/lib/profile-storage';
import { getMockProfiles } from '@/lib/mock-profile-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    const fromMock = getMockProfiles(userId);
    if (fromMock.length > 0) return NextResponse.json(fromMock);

    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from('taste_profiles')
      .select('wine_type, profile_data, updated_at')
      .eq('user_id', userId);
    if (!error && profiles && profiles.length > 0) return NextResponse.json(profiles);

    const fromStorage = await getProfilesFromStorage(userId);
    if (fromStorage.length > 0) return NextResponse.json(fromStorage);
    return NextResponse.json(profiles || []);
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
