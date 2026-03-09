import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await verifyAdmin();
  if (error) return error;

  const { id: userId } = await params;
  const supabase = createAdminClient();

  const [cellarRes, conversationsRes, searchRes] = await Promise.all([
    supabase
      .from('cellar_items')
      .select('id, quantity, created_at, opened_at, consumed_at, wines (id, name, winery, wine_type, country, region, image_url)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('sommelier_conversations')
      .select('id, title, messages, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50),

    supabase
      .from('search_log')
      .select('id, query, search_type, result_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const cellarItems = (cellarRes.data || []).map((item: Record<string, unknown>) => {
    const wine = item.wines as Record<string, unknown> | null;
    return {
      id: item.id,
      wineName: wine?.name || '—',
      winery: wine?.winery || '—',
      wineType: wine?.wine_type || '—',
      country: wine?.country || null,
      region: wine?.region || null,
      imageUrl: wine?.image_url || null,
      quantity: item.quantity,
      openedAt: item.opened_at,
      consumedAt: item.consumed_at,
      createdAt: item.created_at,
    };
  });

  const conversations = (conversationsRes.data || []).map((conv: Record<string, unknown>) => {
    const messages = (conv.messages as Array<{ role: string; content: string }>) || [];
    const userMessages = messages.filter((m) => m.role === 'user');
    return {
      id: conv.id,
      title: conv.title || null,
      preview: userMessages[0]?.content?.slice(0, 120) || null,
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    };
  });

  const searchHistory = (searchRes.data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    query: row.query,
    searchType: row.search_type,
    resultCount: row.result_count,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    cellarItems,
    conversations,
    searchHistory,
  });
}
