import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/onboarding/complete
 * Sets onboarding_completed = true for the current user. No body required.
 * 401 if not signed in.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await supabase
    .from('user_profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id);
  return NextResponse.json({ success: true });
}
