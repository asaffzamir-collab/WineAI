import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { WineData } from '@/lib/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function tryAdmin() {
  try { return createAdminClient(); } catch { return null; }
}

const SPARSE_FIELDS = ['vivino_rating', 'tasting_notes', 'serving', 'food_pairings'] as const;

function isSparse(row: Record<string, unknown>): boolean {
  return SPARSE_FIELDS.every((f) => row[f] == null);
}

export async function POST(request: Request) {
  try {
    const { name, winery, wineId } = await request.json();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const supabase = await createClient();

    const selectCols = `id, name, winery, vivino_rating, vivino_reviews, country, region, grapes,
      alcohol, wine_type, tasting_notes, ai_description, image_url, image_source,
      serving, food_pairings, taste_spectrum`;

    let existing: Record<string, unknown> | null = null;
    if (wineId) {
      const { data, error } = await supabase.from('wines').select(selectCols).eq('id', wineId).single();
      existing = data;
    }
    if (!existing) {
      const { data, error } = await supabase
        .from('wines')
        .select(selectCols)
        .eq('name', name)
        .eq('winery', winery || '')
        .single();
      existing = data;
    }

    if (existing && !isSparse(existing)) {
      return NextResponse.json({ wine: rowToWineData(existing) });
    }

    const { searchWinesByText } = await import('@/lib/openai');
    const results = await searchWinesByText(`${name} ${winery || ''}`);
    const found = results?.[0];
    if (!found) {
      return NextResponse.json({ wine: existing ? rowToWineData(existing) : null });
    }

    const targetId = existing?.id ?? wineId;
    if (targetId) {
      const updates: Record<string, unknown> = {};
      if (found.vivino_rating != null) updates.vivino_rating = found.vivino_rating;
      if (found.vivino_reviews != null) updates.vivino_reviews = found.vivino_reviews;
      if (found.tasting_notes) updates.tasting_notes = found.tasting_notes;
      if (found.alcohol != null) updates.alcohol = found.alcohol;
      if (found.serving) updates.serving = found.serving;
      if (found.food_pairings && found.food_pairings.length > 0) updates.food_pairings = found.food_pairings;
      if (found.winery_description) updates.ai_description = found.winery_description;
      if (found.country && !existing?.country) updates.country = found.country;
      if (found.region && !existing?.region) updates.region = found.region;
      if (found.grapes?.length && !(existing?.grapes as string[])?.length) updates.grapes = found.grapes;
      if (found.taste_spectrum && !existing?.taste_spectrum) updates.taste_spectrum = found.taste_spectrum;
      if (found.image_url && !existing?.image_url) updates.image_url = found.image_url;

      if (Object.keys(updates).length > 0) {
        const admin = tryAdmin();
        const client = admin ?? supabase;
        await client.from('wines').update(updates).eq('id', targetId);
      }
    }

    return NextResponse.json({ wine: found });
  } catch (error) {
    console.error('Wine enrichment error:', error);
    return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 });
  }
}

function rowToWineData(row: Record<string, unknown>): WineData {
  const tn = row.tasting_notes as { nose?: string[]; palate?: string[]; finish?: string } | null;
  return {
    name: row.name as string,
    winery: row.winery as string,
    wine_type: ((row.wine_type as string) || 'red') as WineData['wine_type'],
    country: (row.country as string) || '',
    region: row.region as string | undefined,
    grapes: (row.grapes as string[]) || [],
    vivino_rating: row.vivino_rating as number | undefined,
    vivino_reviews: row.vivino_reviews as number | undefined,
    alcohol: row.alcohol as number | undefined,
    tasting_notes: tn ? { nose: tn.nose || [], palate: tn.palate || [], finish: tn.finish || '' } : undefined,
    winery_description: (row.ai_description as string) || undefined,
    image_url: row.image_url as string | undefined,
    image_source: row.image_source as string | undefined,
    serving: row.serving as WineData['serving'],
    food_pairings: (row.food_pairings as string[]) || undefined,
    taste_spectrum: row.taste_spectrum as WineData['taste_spectrum'],
  };
}
