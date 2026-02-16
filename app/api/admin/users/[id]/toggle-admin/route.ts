import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/[id]/toggle-admin
 * Toggles the is_admin flag for a user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { admin, error } = await verifyAdmin();
  if (error) return error;

  const { id: targetUserId } = await params;
  const { isAdmin } = await request.json();

  // Prevent admin from removing their own admin status
  if (admin!.id === targetUserId && !isAdmin) {
    return NextResponse.json(
      { error: 'Cannot remove your own admin status' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ is_admin: !!isAdmin })
    .eq('id', targetUserId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, isAdmin: !!isAdmin });
}
