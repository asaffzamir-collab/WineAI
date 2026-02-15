'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthPage } from '@/components/pages/auth-page';
import { Wine, Loader2 } from 'lucide-react';

/**
 * Wrapper for /auth: if user already has a session, redirect to home.
 * Otherwise show the sign-in / register form.
 */
export function AuthPageGate() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (user) {
          router.replace('/');
          return;
        }
        setShowForm(true);
      } catch {
        if (!cancelled) setShowForm(true);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!showForm) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-wine-900 to-wine-950">
        <Wine className="h-16 w-16 text-gold-500 mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="mt-4 text-wine-200">Loading...</p>
      </div>
    );
  }
  return <AuthPage />;
}
