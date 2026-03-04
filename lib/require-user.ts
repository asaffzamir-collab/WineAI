import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Require an authenticated user and optionally verify they match a supplied userId.
 * Returns the authenticated user or a 401 JSON response.
 */
export async function requireUser(suppliedUserId?: string | null) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (suppliedUserId && suppliedUserId !== user.id) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { user, error: null };
}
