import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/users/[id]
 * Deletes a user and all their data.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await verifyAdmin();
  if (error) return error;

  const { id: targetUserId } = await params;

  // Prevent admin from deleting themselves
  if (admin!.id === targetUserId) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Delete user data from all tables (order matters due to FK constraints)
  const tables = [
    'store_prices',
    'wine_tastings',
    'cellar_items',
    'wishlist_items',
    'taste_profiles',
    'user_profiles',
  ];

  for (const table of tables) {
    const column = table === 'user_profiles' ? 'id' : 'user_id';
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .eq(column, targetUserId);
    if (delError) {
      console.error(`Error deleting from ${table}:`, delError);
    }
  }

  // Delete the user from Supabase Auth
  const { error: authError } =
    await supabase.auth.admin.deleteUser(targetUserId);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
