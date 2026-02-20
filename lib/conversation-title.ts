/**
 * Auto-generate a short title for a sommelier conversation based on its messages.
 * Uses a lightweight model to keep costs minimal.
 */

interface Message {
  role: string;
  content: string;
}

export async function generateConversationTitle(
  messages: Message[],
  language: string = 'he',
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || messages.length < 2) return null;

  const snippet = messages
    .slice(0, 6)
    .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join('\n');

  const langNote = language === 'he'
    ? 'Write the title in Hebrew.'
    : 'Write the title in English.';

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: key });

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate a short title (3-6 words) for this wine conversation. Return ONLY the title, no quotes, no punctuation at the end. ${langNote}`,
        },
        { role: 'user', content: snippet },
      ],
      temperature: 0.3,
      max_tokens: 30,
    });

    const title = res.choices?.[0]?.message?.content?.trim();
    return title || null;
  } catch (err) {
    console.warn('Failed to generate conversation title:', err);
    return null;
  }
}
