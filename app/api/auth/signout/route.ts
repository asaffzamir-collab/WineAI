import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/signout
 * Signs out the current user (clears session cookies) and redirects to home.
 * Use this to force the sign-in screen, e.g. when testing or after deploying auth changes.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  const home = new URL('/', url.origin);
  return NextResponse.redirect(home, 302);
}
