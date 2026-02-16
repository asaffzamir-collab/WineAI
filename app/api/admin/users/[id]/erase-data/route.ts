import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/[id]/erase-data
 * Erases all wine-related data for a user without deleting the account.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id: targetUserId } = await params;
  const supabase = createAdminClient();

  const tables = [
    'store_prices',
    'wine_tastings',
    'cellar_items',
    'wishlist_items',
    'taste_profiles',
  ];

  const results: Record<string, string> = {};

  for (const table of tables) {
    const { error: delError, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('user_id', targetUserId);

    if (delError) {
      console.error(`Error erasing ${table}:`, delError);
      results[table] = `error: ${delError.message}`;
    } else {
      results[table] = `deleted ${count ?? 0} rows`;
    }
  }

  // Reset onboarding status
  await supabase
    .from('user_profiles')
    .update({ onboarding_completed: false })
    .eq('id', targetUserId);

  return NextResponse.json({ success: true, details: results });
}
