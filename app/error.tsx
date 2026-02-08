'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-lg font-semibold text-wine-900">Something went wrong</h2>
      <p className="max-w-md text-center text-sm text-gray-600">
        If this keeps happening, check that all environment variables are set in Vercel (Settings → Environment Variables): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
