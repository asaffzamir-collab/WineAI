import { createClient } from '@/lib/supabase/server';
import { checkPremiumAccess } from '@/lib/premium';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { paywallActive: false, tier: 'free', isPremium: true },
      );
    }

    const status = await checkPremiumAccess(user.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { paywallActive: false, tier: 'free', isPremium: true },
    );
  }
}
