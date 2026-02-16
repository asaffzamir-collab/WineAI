'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthPage } from '@/components/pages/auth-page';
import { Wine, Loader2 } from 'lucide-react';

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-bordeaux-600 dark:bg-charcoal-900">
        <Wine className="h-16 w-16 text-copper-400 mb-4" strokeWidth={1.5} />
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <p className="mt-4 text-bordeaux-200">Loading...</p>
      </div>
    );
  }
  return <AuthPage />;
}
