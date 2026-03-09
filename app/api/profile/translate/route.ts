import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { trackApiUsage } from '@/lib/track-api-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TRANSLATABLE_FIELDS = [
  'overall_style',
  'body_structure',
  'fruit_profile',
  'style_notes',
  'summary',
] as const;

const TRANSLATABLE_ARRAY_FIELDS = ['what_to_avoid', 'recommended_grapes', 'recommended_regions'] as const;

export async function POST(request: Request) {
  let body: { userId?: string; targetLanguage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, targetLanguage } = body || {};
  if (!userId || !targetLanguage) {
    return NextResponse.json({ error: 'userId and targetLanguage required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from('taste_profiles')
    .select('wine_type, profile_data')
    .eq('user_id', userId);

  if (error || !profiles || profiles.length === 0) {
    return NextResponse.json({ error: 'No profiles found' }, { status: 404 });
  }

  const textsToTranslate: { wineType: string; field: string; text: string; isArray: boolean }[] = [];

  for (const profile of profiles) {
    const pd = profile.profile_data as Record<string, unknown>;
    if (!pd) continue;

    for (const field of TRANSLATABLE_FIELDS) {
      const val = pd[field];
      if (typeof val === 'string' && val.length > 0) {
        textsToTranslate.push({ wineType: profile.wine_type, field, text: val, isArray: false });
      }
    }

    for (const field of TRANSLATABLE_ARRAY_FIELDS) {
      const val = pd[field];
      if (Array.isArray(val) && val.length > 0) {
        textsToTranslate.push({
          wineType: profile.wine_type,
          field,
          text: val.join(' ||| '),
          isArray: true,
        });
      }
    }
  }

  if (textsToTranslate.length === 0) {
    return NextResponse.json({ success: true, translated: 0 });
  }

  const langName = targetLanguage === 'he' ? 'Hebrew' : 'English';
  const combinedText = textsToTranslate
    .map((t, i) => `[${i}] ${t.text}`)
    .join('\n\n');

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for a wine app. Translate ALL the following numbered wine profile texts to ${langName}. Keep wine names, grape names, and region names in their original form. Preserve the tone and meaning exactly. Return ONLY valid JSON: an object where each key is the number (as a string) and the value is the translated text. For items separated by " ||| ", keep the same separator in the translation.`,
        },
        {
          role: 'user',
          content: combinedText,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices?.[0]?.message?.content;
    await trackApiUsage({ userId, service: 'openai', model: 'gpt-4o-mini', feature: 'profile_translate', tokensIn: Math.ceil(combinedText.length / 3), tokensOut: Math.ceil((content?.length || 0) / 3) });
    if (!content) {
      return NextResponse.json({ error: 'Translation returned empty' }, { status: 500 });
    }

    let translations: Record<string, string>;
    try {
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      translations = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Failed to parse translation response' }, { status: 500 });
    }

    const updatedProfiles = new Map<string, Record<string, unknown>>();
    for (const profile of profiles) {
      updatedProfiles.set(
        profile.wine_type,
        { ...(profile.profile_data as Record<string, unknown>) },
      );
    }

    for (let i = 0; i < textsToTranslate.length; i++) {
      const translated = translations[String(i)];
      if (!translated) continue;

      const item = textsToTranslate[i];
      const pd = updatedProfiles.get(item.wineType);
      if (!pd) continue;

      if (item.isArray) {
        pd[item.field] = translated.split(' ||| ').map((s: string) => s.trim()).filter(Boolean);
      } else {
        pd[item.field] = translated;
      }
    }

    const entries = Array.from(updatedProfiles.entries());
    for (const [wineType, profileData] of entries) {
      await supabase
        .from('taste_profiles')
        .update({ profile_data: profileData, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('wine_type', wineType);
    }

    return NextResponse.json({ success: true, translated: textsToTranslate.length });
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
