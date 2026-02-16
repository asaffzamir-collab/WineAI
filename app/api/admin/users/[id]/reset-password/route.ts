import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

function generatePassword(length = 12): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

/**
 * POST /api/admin/users/[id]/reset-password
 * Resets a user's password to a new randomly generated one.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id: targetUserId } = await params;
  const supabase = createAdminClient();

  const newPassword = generatePassword();

  const { error: updateError } =
    await supabase.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ newPassword });
}
