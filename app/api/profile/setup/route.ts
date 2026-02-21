import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        display_name: alias,
        country: country || null,
        birthday: birthday || null,
        gender: gender || null,
        preferred_language: preferredLanguage || 'he',
        profile_completed: true,
      })
      .eq('id', user.id);

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
