import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/sommelier/conversations - list conversations for current user
 * POST /api/sommelier/conversations - create a new conversation
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('sommelier_conversations')
      .select('id, title, messages, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const conversations = (data || []).map((c) => {
      const msgs = Array.isArray(c.messages) ? c.messages : [];
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      return {
        id: c.id,
        title: c.title,
        messageCount: msgs.length,
        lastMessage: lastMsg
          ? (typeof lastMsg === 'object' && lastMsg !== null && 'content' in lastMsg
              ? String((lastMsg as { content: string }).content).slice(0, 100)
              : null)
          : null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Conversations list error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title : null;

    const { data, error } = await supabase
      .from('sommelier_conversations')
      .insert({ user_id: user.id, title, messages: [] })
      .select('id, title, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (error) {
    console.error('Conversation create error:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
