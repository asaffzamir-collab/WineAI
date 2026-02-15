import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 * Signs in a user with email and password.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 500 }
      );
    }

    // Ensure profile exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, onboarding_completed')
      .eq('id', data.user.id)
      .single();

    const displayName =
      profile?.display_name ||
      (data.user.user_metadata as { display_name?: string })?.display_name ||
      data.user.email?.split('@')[0] ||
      'Wine Lover';

    if (!profile) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        display_name: displayName,
        preferred_language: 'he',
        preferred_currency: 'ILS',
        onboarding_completed: false,
      });
    }

    return NextResponse.json({
      id: data.user.id,
      email: data.user.email,
      displayName,
      onboardingCompleted: profile?.onboarding_completed ?? false,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
