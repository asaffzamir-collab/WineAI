import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide?locale=en
 * Returns auto-generated FAQ and Features content for the guide page.
 * Falls back to empty arrays if no content has been generated yet.
 */
export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get('locale') || 'en';

  try {
    const supabase = await createClient();
    const [faqResult, featuresResult] = await Promise.all([
      supabase.from('guide_content').select('content').eq('type', 'faq').eq('locale', locale).single(),
      supabase.from('guide_content').select('content').eq('type', 'features').eq('locale', locale).single(),
    ]);

    return NextResponse.json({
      faq: faqResult.data?.content ?? null,
      features: featuresResult.data?.content ?? null,
    });
  } catch {
    return NextResponse.json({ faq: null, features: null });
  }
}
