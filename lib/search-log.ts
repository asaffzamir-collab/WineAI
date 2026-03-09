import { createAdminClient } from '@/lib/supabase/server';

interface LogSearchParams {
  userId: string;
  query: string;
  searchType: 'text' | 'image';
  resultCount: number;
}

export async function logSearch(params: LogSearchParams): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('search_log').insert({
      user_id: params.userId,
      query: params.query,
      search_type: params.searchType,
      result_count: params.resultCount,
    });
    if (error) {
      console.error('[logSearch] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[logSearch] error:', err instanceof Error ? err.message : err);
  }
}
