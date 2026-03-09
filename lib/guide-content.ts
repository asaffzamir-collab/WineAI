import type { ChangelogEntry } from './changelog';
import { trackApiUsage } from '@/lib/track-api-usage';

export interface FaqItem {
  question: string;
  questionHe: string;
  answer: string;
  answerHe: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  titleHe: string;
  description: string;
  descriptionHe: string;
}

export interface GuideContent {
  faq: FaqItem[];
  features: FeatureItem[];
}

const FEATURE_IDS = ['search', 'sommelier', 'cellar', 'wishlist', 'profile'] as const;

function buildPrompt(entries: ChangelogEntry[]): string {
  const changelogSummary = entries
    .map(
      (e) =>
        `v${e.version} (${e.date}) - ${e.title}\n${e.highlights
          .map((h) => `  [${h.tag}] ${h.text}`)
          .join('\n')}`,
    )
    .join('\n\n');

  return `You are helping maintain a wine app called WineJourney. Based on the changelog below, generate updated guide content.

CHANGELOG:
${changelogSummary}

APP FEATURES (IDs: ${FEATURE_IDS.join(', ')}):
- search: Wine search by text or photo of the front of the wine bottle, AI identification, personal match scores, tasting notes, Vivino ratings
- sommelier: "Pier" AI personal sommelier — chat conversations, food pairing, wine recommendations, buying intelligence, wine for tonight
- cellar: Wine cellar management with list view, customizable 3D wine rack, readiness heatmap, cellar insights & gap analysis
- wishlist: Save wines to try later, quick add from search or sommelier
- profile: Taste profile built from liked wines, visual spectrum (body/tannin/sweetness/acidity), red/white/rosé profiles

GENERATE in strict JSON:
{
  "faq": [
    { "question": "...", "questionHe": "...", "answer": "...", "answerHe": "..." }
  ],
  "features": [
    { "id": "search|sommelier|cellar|wishlist|profile", "title": "...", "titleHe": "...", "description": "...", "descriptionHe": "..." }
  ]
}

RULES:
- Generate exactly 6 FAQ items covering: how the taste profile works, photographing a wine bottle for identification, what to ask the sommelier, cellar organization, data privacy, language switching.
- IMPORTANT: The app identifies wines by photographing the front of the wine bottle (NOT the label). Always refer to "the front of the wine bottle" and never say "wine label" or "label scan".
- FAQ answers should reflect the LATEST capabilities from the changelog.
- Generate exactly 5 feature items (one per ID above).
- Feature descriptions should be 1-2 sentences highlighting the latest improvements.
- All Hebrew text must be natural, fluent Hebrew.
- Return ONLY valid JSON, no markdown fences.`;
}

/**
 * Call OpenAI to regenerate FAQ and feature descriptions based on the full
 * changelog history. Returns null if the call fails.
 */
export async function regenerateGuideContent(
  entries: ChangelogEntry[],
): Promise<GuideContent | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 3000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a helpful assistant that generates JSON.' },
          { role: 'user', content: buildPrompt(entries) },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[guide-content] OpenAI returned', res.status);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    await trackApiUsage({ service: 'openai', model: 'gpt-4o-mini', feature: 'guide_regeneration', tokensIn: Math.ceil(buildPrompt(entries).length / 3), tokensOut: Math.ceil((text?.length || 0) / 3) });
    if (!text) return null;

    const parsed = JSON.parse(text) as GuideContent;

    if (!Array.isArray(parsed.faq) || !Array.isArray(parsed.features)) return null;

    return parsed;
  } catch (err) {
    console.error('[guide-content] Generation failed:', err);
    return null;
  }
}

/**
 * Fetch guide content from the DB via the public API endpoint.
 * Used client-side; the guide page calls /api/guide directly instead.
 */
export async function fetchGuideContentFromApi(
  locale: string,
): Promise<{ faq: unknown[] | null; features: unknown[] | null }> {
  try {
    const res = await fetch(`/api/guide?locale=${locale}`);
    if (!res.ok) return { faq: null, features: null };
    const data = await res.json();
    return {
      faq: Array.isArray(data.faq) ? data.faq : null,
      features: Array.isArray(data.features) ? data.features : null,
    };
  } catch {
    return { faq: null, features: null };
  }
}
