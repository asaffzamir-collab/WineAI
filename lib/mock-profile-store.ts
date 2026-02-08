/**
 * In-memory store for taste profiles when using the mock user.
 * Guarantees "Add to profile" works without DB or Storage. Data is lost on server restart.
 */

export const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface MockProfileRow {
  wine_type: string;
  profile_data: Record<string, unknown>;
  updated_at: string;
}

const store = new Map<string, MockProfileRow[]>();

export function setMockProfile(
  userId: string,
  wineType: string,
  profileData: Record<string, unknown>
): void {
  if (userId !== MOCK_USER_ID) return;
  const rows = store.get(userId) ?? [];
  const existingIdx = rows.findIndex((r) => r.wine_type === wineType);
  const newRow: MockProfileRow = {
    wine_type: wineType,
    profile_data: profileData,
    updated_at: new Date().toISOString(),
  };
  if (existingIdx >= 0) rows[existingIdx] = newRow;
  else rows.push(newRow);
  store.set(userId, rows);
}

export function getMockProfiles(userId: string): MockProfileRow[] {
  if (userId !== MOCK_USER_ID) return [];
  return store.get(userId) ?? [];
}
