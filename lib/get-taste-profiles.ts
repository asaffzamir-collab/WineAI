/**
 * Server-side: get taste profiles for a user in the shape expected by wine search (matching).
 */

import { createClient } from '@/lib/supabase/server';

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
    const supabase = await createClient();
    const { data: profiles } = await supabase
      .from('taste_profiles')
      .select('wine_type, profile_data')
      .eq('user_id', userId);

    if (profiles && profiles.length > 0) {
      return reduceToMap(profiles as Array<{ wine_type: string; profile_data: Record<string, unknown> }>);
    }
  } catch (e) {
    console.error('getTasteProfilesForUser error:', e);
  }
  return {};
}
