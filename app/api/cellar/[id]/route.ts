import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cellar_items')
      .select(`
        id, quantity, purchase_price, purchase_date, notes,
        wines (id, name, winery, wine_type, country, region, grapes,
               vivino_rating, vivino_reviews, alcohol, tasting_notes,
               ai_description, image_url, serving, food_pairings)
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const wine = Array.isArray(data.wines) ? data.wines[0] : data.wines;

    return NextResponse.json({
      cellarItem: data,
      wine: wine
        ? {
            name: wine.name,
            winery: wine.winery,
            wine_type: wine.wine_type,
            country: wine.country,
            region: wine.region,
            grapes: wine.grapes,
            vivino_rating: wine.vivino_rating,
            vivino_reviews: wine.vivino_reviews,
            alcohol: wine.alcohol,
            tasting_notes: wine.tasting_notes,
            winery_description: wine.ai_description,
            image_url: wine.image_url,
            serving: wine.serving,
            food_pairings: wine.food_pairings,
          }
        : null,
    });
  } catch (error) {
    console.error('Cellar item GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
