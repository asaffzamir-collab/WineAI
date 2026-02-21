import { createAdminClient, createClient } from '@/lib/supabase/server';
import { regenerateGuideContent } from '@/lib/guide-content';
import { changelog } from '@/lib/changelog';
import type { ChangelogEntry, ChangelogHighlight } from '@/lib/changelog';

interface DbRow {
  version: string;
  date: string;
  title: string;
  title_he: string;
  highlights: ChangelogHighlight[];
}

/**
 * Reads the latest changelog and regenerates guide content (FAQ + Features)
 * using OpenAI, then persists the results to the guide_content table.
 * Safe to call fire-and-forget; errors are logged but not thrown.
 */
export async function triggerGuideRegeneration(): Promise<void> {
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
    console.warn('[guide-regen] OpenAI generation returned null');
    return;
  }

  const admin = createAdminClient();

  const upserts = [
    { type: 'faq', locale: 'en', content: generated.faq.map((f) => ({ question: f.question, answer: f.answer })) },
    { type: 'faq', locale: 'he', content: generated.faq.map((f) => ({ question: f.questionHe, answer: f.answerHe })) },
    { type: 'features', locale: 'en', content: generated.features.map((f) => ({ id: f.id, title: f.title, description: f.description })) },
    { type: 'features', locale: 'he', content: generated.features.map((f) => ({ id: f.id, title: f.titleHe, description: f.descriptionHe })) },
  ];

  for (const row of upserts) {
    const { error } = await admin
      .from('guide_content')
      .upsert(
        { ...row, updated_at: new Date().toISOString() },
        { onConflict: 'type,locale' },
      );
    if (error) console.error(`[guide-regen] Upsert failed for ${row.type}/${row.locale}:`, error);
  }

  console.log('[guide-regen] Guide content regenerated successfully');
}
