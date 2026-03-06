import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Fast autocomplete endpoint. Queries the `wines` table using
 * the existing trigram indexes for sub-100ms response times.
 * Returns lightweight results (name, winery, wine_type, image_url) only.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = await createClient();
    const normalized = q.toLowerCase();

    const { data, error } = await supabase
      .from('wines')
      .select('name, winery, wine_type, region, country, image_url')
      .or(`name.ilike.%${normalized}%,winery.ilike.%${normalized}%`)
      .order('vivino_rating', { ascending: false, nullsFirst: false })
      .limit(8);

    if (error || !data) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = data.map(row => ({
      name: row.name as string,
      winery: row.winery as string,
      wine_type: row.wine_type as string | null,
      region: row.region as string | null,
      country: row.country as string | null,
      image_url: row.image_url
        ? (row.image_url as string).replace(/^http:\/\//, 'https://')
        : null,
    }));

    return NextResponse.json(
      { suggestions },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
