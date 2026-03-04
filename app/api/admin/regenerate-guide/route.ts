import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { regenerateGuideContent } from '@/lib/guide-content';
import { changelog } from '@/lib/changelog';
import type { ChangelogEntry, ChangelogHighlight } from '@/lib/changelog';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface DbRow {
  version: string;
  date: string;
  title: string;
  title_he: string;
  highlights: ChangelogHighlight[];
}

/**
 * POST /api/admin/regenerate-guide
 * Regenerates FAQ and Features content based on the current changelog
 * using OpenAI, then stores the results in the guide_content table.
 */
export async function POST() {
  const { error } = await verifyAdmin();
  if (error) return error;

  try {
    const supabase = await createClient();
    const { data: dbEntries } = await supabase
      .from('changelog_entries')
      .select('version, date, title, title_he, highlights')
      .order('date', { ascending: false });

    const entries: ChangelogEntry[] =
      dbEntries && dbEntries.length > 0
        ? (dbEntries as DbRow[]).map((r) => ({
            version: r.version,
            date: r.date,
            title: r.title,
            titleHe: r.title_he,
            highlights: Array.isArray(r.highlights) ? r.highlights : [],
          }))
        : changelog;

    const generated = await regenerateGuideContent(entries);
    if (!generated) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const admin = createAdminClient();

    const faqEn = generated.faq.map((f) => ({ question: f.question, answer: f.answer }));
    const faqHe = generated.faq.map((f) => ({ question: f.questionHe, answer: f.answerHe }));
    const featEn = generated.features.map((f) => ({ id: f.id, title: f.title, description: f.description }));
    const featHe = generated.features.map((f) => ({ id: f.id, title: f.titleHe, description: f.descriptionHe }));

    const upserts = [
      { type: 'faq', locale: 'en', content: faqEn },
      { type: 'faq', locale: 'he', content: faqHe },
      { type: 'features', locale: 'en', content: featEn },
      { type: 'features', locale: 'he', content: featHe },
    ];

    for (const row of upserts) {
      await admin
        .from('guide_content')
        .upsert(
          { ...row, updated_at: new Date().toISOString() },
          { onConflict: 'type,locale' },
        );
    }

    return NextResponse.json({
      success: true,
      faqCount: generated.faq.length,
      featuresCount: generated.features.length,
    });
  } catch (err) {
    console.error('Regenerate guide error:', err);
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 });
  }
}
