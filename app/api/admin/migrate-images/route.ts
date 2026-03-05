import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';
import { detectSource } from '@/lib/wine-image';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/admin/migrate-images?action=backfill-source
 *
 * Backfills the `image_source` column for all wines that have an `image_url`
 * but no `image_source` yet. Detects the source from the URL pattern.
 *
 * POST /api/admin/migrate-images?action=stats
 *
 * Returns statistics about image URLs and sources in the wines table.
 */
export async function POST(request: Request) {
  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'stats';

  try {
    const supabase = createAdminClient();

    if (action === 'stats') {
      const { data: wines, error } = await supabase
        .from('wines')
        .select('id, name, winery, image_url, image_source')
        .not('image_url', 'is', null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const total = wines?.length || 0;
      const withSource = wines?.filter(w => w.image_source).length || 0;
      const withoutSource = total - withSource;
      const bySource: Record<string, number> = {};
      for (const w of wines || []) {
        const src = w.image_source || 'unknown';
        bySource[src] = (bySource[src] || 0) + 1;
      }

      return NextResponse.json({ total, withSource, withoutSource, bySource });
    }

    if (action === 'backfill-source') {
      const { data: wines, error } = await supabase
        .from('wines')
        .select('id, image_url')
        .not('image_url', 'is', null)
        .is('image_source', null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      let updated = 0;

      for (const wine of wines || []) {
        const source = detectSource(wine.image_url);

        const isSelfhosted = wine.image_url.includes('supabase') && wine.image_url.includes('wine-images');
        const finalSource = isSelfhosted ? 'selfhosted' : source;

        const { error: updateErr } = await supabase
          .from('wines')
          .update({ image_source: finalSource })
          .eq('id', wine.id);

        if (!updateErr) updated++;
      }

      return NextResponse.json({ updated, total: wines?.length || 0 });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
