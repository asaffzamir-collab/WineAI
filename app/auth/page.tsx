import { AuthPageGate } from '@/components/auth-page-gate';

export const dynamic = 'force-dynamic';

/**
 * /auth - Shows the sign-in form. If already logged in, redirects to /.
 * Share this URL with testers: https://YOUR_APP_URL/auth
 */
export default function AuthRoutePage() {
  return <AuthPageGate />;
}
