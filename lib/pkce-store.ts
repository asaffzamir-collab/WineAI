/**
 * Server-side PKCE verifier store (Supabase table).
 * Used so the callback can retrieve the verifier after redirects without relying on cookies.
 */

import { createAdminClient } from '@/lib/supabase/server';

const TABLE = 'pkce_verifiers';
const MAX_AGE_MINUTES = 15;

export async function saveCodeVerifier(codeVerifier: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ code_verifier: codeVerifier })
    .select('id')
    .single();
  if (error) {
    console.error('pkce_verifiers insert error:', error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function getAndDeleteCodeVerifier(id: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('code_verifier')
    .eq('id', id)
    .single();
  if (error || !data?.code_verifier) return null;
  await supabase.from(TABLE).delete().eq('id', id);
  return data.code_verifier;
}

/** Remove rows older than MAX_AGE_MINUTES (call occasionally). */
export async function deleteExpiredCodeVerifiers(): Promise<void> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - MAX_AGE_MINUTES * 60 * 1000).toISOString();
  await supabase.from(TABLE).delete().lt('created_at', cutoff);
}
