import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { combineChunks, stringFromBase64URL } from '@supabase/ssr';
import { getAndDeleteCodeVerifier } from '@/lib/pkce-store';

const PKCE_ID_COOKIE = 'pkce_id';
const CODE_VERIFIER_KEY = 'sb-wineai-auth-code-verifier';
const BASE64_PREFIX = 'base64-';

/** Get verifier from DB: pkce_id from URL (preferred) or cookie; else legacy cookie. */
async function getCodeVerifier(
  request: NextRequest,
  pkceIdFromUrl: string | null
): Promise<string | null> {
  const pkceId = pkceIdFromUrl ?? request.cookies.get(PKCE_ID_COOKIE)?.value;
  if (pkceId) {
    const fromDb = await getAndDeleteCodeVerifier(pkceId);
    if (fromDb) return fromDb;
  }
  const all = request.cookies.getAll();
  const retrieve = (chunkName: string) => all.find((c) => c.name === chunkName)?.value ?? null;
  const combined = await combineChunks(CODE_VERIFIER_KEY, retrieve);
  if (!combined) return null;
  if (combined.startsWith(BASE64_PREFIX)) {
    return stringFromBase64URL(combined.slice(BASE64_PREFIX.length));
  }
  return combined;
}

/**
 * Exchange auth code for session via Supabase token API (bypasses client storage).
 */
async function exchangeCodeWithVerifier(
  supabaseUrl: string,
  anonKey: string,
  code: string,
  codeVerifier: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (data.access_token && data.refresh_token) {
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  }
  return null;
}

/**
 * Auth callback route handler (server).
 * Exchanges the auth code for a session. Reads PKCE verifier from cookies;
 * if the client cannot find it, we read it from the request and call the token API directly.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description') ?? '';

  const redirectToError = (err: string, desc: string) =>
    NextResponse.redirect(
      new URL(
        `/auth/auth-code-error?error=${err}&error_description=${encodeURIComponent(desc)}`,
        request.url
      )
    );

  if (error) {
    return redirectToError(error, errorDescription);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  const supabase = await createClient();
  let exchangeError: Error | null = null;
  const result = await supabase.auth.exchangeCodeForSession(code);
  if (result.error) exchangeError = result.error;

  // If PKCE verifier not in storage: get from DB. pkce_id comes from state (echoed by Supabase) or URL or cookie
  if (exchangeError?.message?.includes('PKCE code verifier')) {
    const pkceIdFromUrl = searchParams.get('state') ?? searchParams.get('pkce_id');
    const codeVerifier = await getCodeVerifier(request, pkceIdFromUrl);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (codeVerifier && supabaseUrl && anonKey) {
      const session = await exchangeCodeWithVerifier(supabaseUrl, anonKey, code, codeVerifier);
      if (session) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (!setErr) exchangeError = null;
      }
    }
  }

  if (exchangeError) {
    const hasRetried = searchParams.get('retry') === '1';
    if (exchangeError.message.includes('PKCE code verifier') && !hasRetried) {
      const retryUrl = new URL(request.url);
      retryUrl.searchParams.set('retry', '1');
      return NextResponse.redirect(retryUrl);
    }
    console.error('Auth callback exchange error:', exchangeError);
    return redirectToError('exchange_failed', exchangeError.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectToError('no_user', 'Could not retrieve user information');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const meta = user.user_metadata as { given_name?: string; full_name?: string } | undefined;
    const displayName =
      meta?.given_name ||
      (meta?.full_name?.trim() ? meta.full_name.split(/\s+/)[0] : null) ||
      user.email?.split('@')[0] ||
      'Wine Lover';
    await supabase.from('user_profiles').insert({
      id: user.id,
      display_name: displayName,
      preferred_language: 'he',
      preferred_currency: 'ILS',
      onboarding_completed: false,
    });
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (!profile.onboarding_completed) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return NextResponse.redirect(new URL('/', request.url));
}
