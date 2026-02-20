import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: profile, error: fetchError } = await admin
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newTier = profile.subscription_tier === 'premium' ? 'free' : 'premium';

    const { error: updateError } = await admin
      .from('user_profiles')
      .update({ subscription_tier: newTier })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ subscription_tier: newTier });
  } catch (err) {
    console.error('Toggle premium error:', err);
    return NextResponse.json({ error: 'Failed to toggle premium' }, { status: 500 });
  }
}
