/**
 * Server-side: get taste profiles for a user in the shape expected by wine search (matching).
 * Uses same sources as GET /api/profile: mock store → DB → storage.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getMockProfiles } from '@/lib/mock-profile-store';
import { getProfilesFromStorage } from '@/lib/profile-storage';

function reduceToMap(
  rows: Array<{ wine_type: string; profile_data: Record<string, unknown> }>
): Record<string, unknown> {
  return rows.reduce((acc, p) => {
    acc[p.wine_type] = p.profile_data;
    return acc;
  }, {} as Record<string, unknown>);
}

export async function getTasteProfilesForUser(userId: string): Promise<Record<string, unknown>> {
  try {
    const fromMock = getMockProfiles(userId);
    if (fromMock.length > 0) {
      return reduceToMap(fromMock);
    }

    const supabase = createAdminClient();
    const { data: profiles } = await supabase
      .from('taste_profiles')
      .select('wine_type, profile_data')
      .eq('user_id', userId);

    if (profiles && profiles.length > 0) {
      return reduceToMap(profiles as Array<{ wine_type: string; profile_data: Record<string, unknown> }>);
    }

    const fromStorage = await getProfilesFromStorage(userId);
    if (fromStorage.length > 0) {
      return reduceToMap(fromStorage);
    }
  } catch (e) {
    console.error('getTasteProfilesForUser error:', e);
  }
  return {};
}
