'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { HomePage } from '@/components/pages/home-page';
import { AuthPage } from '@/components/pages/auth-page';
import { Loader2 } from 'lucide-react';
import { WineLogo } from '@/components/wine-logo';

type Me = {
  id: string;
  email: string | null;
  profileCompleted: boolean;
  onboardingCompleted: boolean;
  displayName: string | null;
};

export function RootGate() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'auth' | 'home'>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setState('auth');
          return;
        }

        const res = await fetch('/api/me', { credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) {
          setState('auth');
          return;
        }
        const me: Me = await res.json();

        if (!me.profileCompleted) {
          router.replace('/onboarding/profile');
          return;
        }
        if (!me.onboardingCompleted) {
          router.replace('/sommelier/welcome');
          return;
        }
        setUserId(me.id);
        setDisplayName(me.displayName ?? null);
        setState('home');
      } catch (e) {
        console.error('RootGate error:', e);
        if (!cancelled) setState('auth');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [router]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bordeaux-600 dark:bg-charcoal-900">
        <WineLogo size={64} className="text-copper-400 mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="mt-4 text-bordeaux-200">Loading...</p>
      </div>
    );
  }

  if (state === 'auth') {
    return <AuthPage />;
  }

  if (userId) {
    return <HomePage userId={userId} displayName={displayName ?? undefined} />;
  }

  return null;
}
