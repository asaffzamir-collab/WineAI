import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * Check if the current authenticated user is an admin.
 * Returns the user object if admin, null otherwise.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) return null;

  return user;
}

/**
 * Verify admin status for API routes. Returns { admin, error } where
 * admin is the user object or null, and error is a Response to return.
 */
export async function verifyAdmin(): Promise<{
  admin: { id: string; email?: string } | null;
  error: Response | null;
}> {
  const admin = await requireAdmin();
  if (!admin) {
    return {
      admin: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  return { admin, error: null };
}
