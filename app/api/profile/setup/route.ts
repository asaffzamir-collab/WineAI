import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function tryEnsureProfileSchema(): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/ensure-schema`,
      { method: 'POST' },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, alias, country, birthday, gender, preferredLanguage } = body;

    if (!firstName || !lastName || !alias) {
      return NextResponse.json({ error: 'First name, last name, and alias are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updatePayload = {
      first_name: firstName,
      last_name: lastName,
      display_name: alias,
      country: country || null,
      birthday: birthday || null,
      gender: gender || null,
      preferred_language: preferredLanguage || 'he',
      profile_completed: true,
    };

    let { error } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', user.id);

    if (error && (error.message?.includes('first_name') || error.message?.includes('profile_completed') || error.message?.includes('column'))) {
      const migrated = await tryEnsureProfileSchema();
      if (migrated) {
        const retry = await supabase
          .from('user_profiles')
          .update(updatePayload)
          .eq('id', user.id);
        error = retry.error;
      }
    }

    if (error) {
      console.error('Profile setup error:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Profile setup error:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
