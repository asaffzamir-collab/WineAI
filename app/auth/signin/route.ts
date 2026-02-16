import { NextResponse, type NextRequest } from 'next/server';
import { saveCodeVerifier } from '@/lib/pkce-store';

/**
 * Generate a PKCE code verifier (same algorithm as @supabase/auth-js).
 */
function generatePKCEVerifier(): string {
  const verifierLength = 56;
  const array = new Uint32Array(verifierLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    return Array.from(array, (n) => ('0' + (n >>> 0).toString(16)).slice(-2)).join('');
  }
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < verifierLength; i++) {
    verifier += charSet.charAt(Math.floor(Math.random() * charSet.length));
  }
  return verifier;
}

/**
 * Generate PKCE code challenge from verifier (S256).
 */
async function generatePKCEChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  const binary = Array.from(bytes)
    .map((c) => String.fromCharCode(c))
    .join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Start OAuth on the server: set PKCE code verifier in response cookie, then redirect to provider.
 * This guarantees the callback request will have the verifier cookie.
 */
export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') || 'google';
  if (provider !== 'google') {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  const origin = request.nextUrl.origin;

  const codeVerifier = generatePKCEVerifier();
  const codeChallenge = await generatePKCEChallenge(codeVerifier);

  const pkceId = await saveCodeVerifier(codeVerifier);
  if (!pkceId) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Pass pkce_id in state (Supabase echoes it back) and in redirect_to as fallback
  const redirectTo = `${origin}/auth/callback?pkce_id=${encodeURIComponent(pkceId)}`;

  return NextResponse.redirect(
    `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=s256&state=${encodeURIComponent(pkceId)}`
  );
}
