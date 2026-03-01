import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const STORAGE_BUCKET = 'wine-images';
const EXTERNAL_PATTERNS = ['images.vivino.com', 'images.wine-searcher.net'];

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function imageStoragePath(wineName: string, winery: string, ext: string): string {
  const slug = `${winery}_${wineName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
  return `${slug}.${ext}`;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dry') === '1';

  try {
    const supabase = createAdminClient();

    const { error: bucketErr } = await supabase.storage.getBucket(STORAGE_BUCKET);
    if (bucketErr) {
      const { error: createErr } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: true });
      if (createErr) {
        return NextResponse.json({ error: `Cannot create bucket: ${createErr.message}` }, { status: 500 });
      }
    }

    const { data: wines, error } = await supabase
      .from('wines')
      .select('id, name, winery, image_url')
      .not('image_url', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const external = (wines || []).filter((w) =>
      w.image_url && EXTERNAL_PATTERNS.some((p) => w.image_url.includes(p))
    );

    if (dryRun) {
      return NextResponse.json({
        total_wines_with_images: wines?.length || 0,
        external_hotlinked: external.length,
        wines: external.map((w) => ({ id: w.id, name: w.name, winery: w.winery, image_url: w.image_url })),
      });
    }

    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const wine of external) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);
        const res = await fetch(wine.image_url, {
          signal: controller.signal,
          headers: { 'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          failed++;
          errors.push(`${wine.name}: HTTP ${res.status}`);
          continue;
        }

        const contentType = res.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
        const bytes = await res.arrayBuffer();

        if (bytes.byteLength < 5000) {
          failed++;
          errors.push(`${wine.name}: too small (${bytes.byteLength}B)`);
          continue;
        }

        const path = imageStoragePath(wine.name, wine.winery, ext);
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, bytes, { contentType, upsert: true });

        if (uploadErr) {
          failed++;
          errors.push(`${wine.name}: upload error - ${uploadErr.message}`);
          continue;
        }

        const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

        await supabase
          .from('wines')
          .update({ image_url: publicUrl.publicUrl })
          .eq('id', wine.id);

        migrated++;
      } catch (err) {
        failed++;
        errors.push(`${wine.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }

    return NextResponse.json({ migrated, failed, errors: errors.slice(0, 20) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
