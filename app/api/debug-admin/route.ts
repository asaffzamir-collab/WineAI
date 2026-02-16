import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, unknown> = {};

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    checks.auth = {
      success: !authError,
      hasUser: !!user,
      userId: user?.id || null,
      userEmail: user?.email || null,
      error: authError?.message || null,
    };

    if (!user) {
      return NextResponse.json({ result: 'NOT_AUTHENTICATED', checks });
    }

    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    checks.serviceKey = { present: hasServiceKey };

    if (!hasServiceKey) {
      return NextResponse.json({ result: 'MISSING_SERVICE_KEY', checks });
    }

    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    checks.profile = {
      success: !profileError,
      data: profile || null,
      error: profileError?.message || null,
    };

    if (!profile) {
      return NextResponse.json({ result: 'NO_PROFILE', checks });
    }

    checks.admin = {
      isAdmin: profile.is_admin,
      type: typeof profile.is_admin,
    };

    if (!profile.is_admin) {
      return NextResponse.json({ result: 'NOT_ADMIN', checks });
    }

    return NextResponse.json({ result: 'SUCCESS', checks });
  } catch (error) {
    return NextResponse.json(
      { result: 'EXCEPTION', checks, error: String(error) },
      { status: 500 }
    );
  }
}
