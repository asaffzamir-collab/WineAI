import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug-admin
 * Debug endpoint to check admin authentication status
 * This helps diagnose why admin access might be failing
 */
export async function GET() {
  const debugInfo: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // Check 1: Get current authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    debugInfo.checks = {
      ...debugInfo.checks,
      authCheck: {
        success: !authError,
        hasUser: !!user,
        userId: user?.id || null,
        userEmail: user?.email || null,
        error: authError?.message || null,
      },
    };

    if (!user) {
      return NextResponse.json({
        ...debugInfo,
        result: 'NOT_AUTHENTICATED',
        message: 'No authenticated user found',
      });
    }

    // Check 2: Verify service role key is available
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    debugInfo.checks = {
      ...debugInfo.checks,
      serviceKeyCheck: {
        hasServiceKey,
        keyLength: hasServiceKey
          ? process.env.SUPABASE_SERVICE_ROLE_KEY!.length
          : 0,
      },
    };

    if (!hasServiceKey) {
      return NextResponse.json({
        ...debugInfo,
        result: 'MISSING_SERVICE_KEY',
        message: 'SUPABASE_SERVICE_ROLE_KEY environment variable is not set',
      });
    }

    // Check 3: Try to fetch profile with admin client
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    debugInfo.checks = {
      ...debugInfo.checks,
      profileCheck: {
        success: !profileError,
        hasProfile: !!profile,
        profileData: profile || null,
        error: profileError?.message || null,
        errorDetails: profileError?.details || null,
        errorHint: profileError?.hint || null,
      },
    };

    if (profileError) {
      return NextResponse.json({
        ...debugInfo,
        result: 'PROFILE_FETCH_ERROR',
        message: 'Failed to fetch user profile',
      });
    }

    if (!profile) {
      return NextResponse.json({
        ...debugInfo,
        result: 'NO_PROFILE',
        message: 'User profile not found in database',
      });
    }

    // Check 4: Verify admin status
    const isAdmin = profile.is_admin === true;
    debugInfo.checks = {
      ...debugInfo.checks,
      adminCheck: {
        isAdmin,
        isAdminValue: profile.is_admin,
        isAdminType: typeof profile.is_admin,
      },
    };

    if (!isAdmin) {
      return NextResponse.json({
        ...debugInfo,
        result: 'NOT_ADMIN',
        message: 'User is authenticated but is_admin is not true',
      });
    }

    // All checks passed
    return NextResponse.json({
      ...debugInfo,
      result: 'SUCCESS',
      message: 'User is authenticated and is an admin',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...debugInfo,
        result: 'EXCEPTION',
        message: 'An exception occurred during checks',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
