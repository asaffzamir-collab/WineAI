/**
 * Fallback storage for taste profiles when DB (taste_profiles table) fails (e.g. FK constraint).
 * Uses Supabase Storage bucket "taste-profiles", one JSON file per user.
 */

import { createAdminClient } from '@/lib/supabase/server';

const BUCKET = 'taste-profiles';

export interface StoredProfileRow {
  wine_type: string;
  profile_data: Record<string, unknown>;
  updated_at: string;
}

export async function saveProfileToStorage(
  userId: string,
  wineType: string,
  profileData: Record<string, unknown>
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const path = `${userId}.json`;
    const now = new Date().toISOString();

    let rows: StoredProfileRow[] = [];
    const { data: existing } = await supabase.storage.from(BUCKET).download(path);
    if (existing) {
      const text = await existing.text();
      try {
        rows = JSON.parse(text);
      } catch {
        rows = [];
      }
    }

    const existingIdx = rows.findIndex((r) => r.wine_type === wineType);
    const newRow: StoredProfileRow = { wine_type: wineType, profile_data: profileData, updated_at: now };
    if (existingIdx >= 0) rows[existingIdx] = newRow;
    else rows.push(newRow);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, JSON.stringify(rows), { upsert: true, contentType: 'application/json' });

    if (uploadError) {
      const msg = (uploadError.message || '').toLowerCase();
      const bucketMissing = msg.includes('bucket') && (msg.includes('not found') || msg.includes('does not exist'));
      if (bucketMissing) {
        const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: false });
        if (!createErr) {
          const { error: retry } = await supabase.storage
            .from(BUCKET)
            .upload(path, JSON.stringify(rows), { upsert: true, contentType: 'application/json' });
          if (!retry) return true;
        }
      }
      console.error('Profile storage save error:', uploadError);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Profile storage save exception:', e);
    return false;
  }
}

export async function getProfilesFromStorage(userId: string): Promise<StoredProfileRow[]> {
  try {
    const supabase = createAdminClient();
    const path = `${userId}.json`;
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return [];
    const text = await data.text();
    const rows = JSON.parse(text);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
