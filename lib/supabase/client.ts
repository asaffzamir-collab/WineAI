import { createBrowserClient } from '@supabase/ssr';

const COOKIE_NAME = 'sb-wineai-auth';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables, then redeploy.'
    );
  }
  return createBrowserClient(url, key, {
    cookieOptions: {
      name: COOKIE_NAME,
      path: '/',
      sameSite: 'lax',
      secure: typeof window !== 'undefined' && window.location?.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 400,
    },
  });
}
