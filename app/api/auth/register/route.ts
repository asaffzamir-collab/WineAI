import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 * Registers a new user with email and password using the admin API
 * so the user is auto-confirmed (no email verification required).
 * Creates a user_profile row automatically.
 */
export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Use admin API to create a pre-confirmed user (skips email verification)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split('@')[0],
      },
    });

    if (error) {
      // Handle duplicate email
      if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Registration failed' },
        { status: 500 }
      );
    }

    // Create user profile
    const name = displayName || email.split('@')[0];
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      display_name: name,
      preferred_language: 'he',
      preferred_currency: 'ILS',
      onboarding_completed: false,
    });

    return NextResponse.json({
      id: data.user.id,
      email: data.user.email,
      displayName: name,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
