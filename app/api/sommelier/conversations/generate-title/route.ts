import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateConversationTitle } from '@/lib/conversation-title';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, snippet } = await request.json();
    if (!conversationId || !snippet) {
      return NextResponse.json({ error: 'Missing conversationId or snippet' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const locale = cookieStore.get('locale')?.value || 'he';

    const messages = snippet.split('\n').map((line: string) => {
      const [role, ...rest] = line.split(': ');
      return { role: role.trim(), content: rest.join(': ').trim() };
    });

    const title = await generateConversationTitle(messages, locale);
    if (!title) {
      return NextResponse.json({ title: null });
    }

    await supabase
      .from('sommelier_conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Generate title error:', error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
