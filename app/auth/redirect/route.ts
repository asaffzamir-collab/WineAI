import { NextResponse, type NextRequest } from 'next/server';

/**
 * Same-origin hop before redirecting to the OAuth provider.
 * Ensures the PKCE code verifier cookie is committed and sent on the next request.
 * Use: redirect to /auth/redirect?next=<encoded_oauth_url> instead of going straight to the provider.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');
  if (!next) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  try {
    const url = new URL(decodeURIComponent(next));
    const allowed =
      url.origin === request.nextUrl.origin ||
      url.hostname === 'winejourney.co' ||
      url.hostname.endsWith('.winejourney.co') ||
      url.hostname.endsWith('.supabase.co') ||
      url.hostname.endsWith('.google.com');
    if (!allowed) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}
