'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function AuthPage() {
  const t = useTranslations('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignInWithGoogle = async () => {
    setIsLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setIsLoading(false);
    }
    // Otherwise browser redirects to Google
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-wine-900 to-wine-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Wine className="mx-auto h-16 w-16 text-gold-500" />
          <h1 className="mt-6 text-3xl font-bold text-white">{t('welcome')}</h1>
          <p className="mt-2 text-wine-200">{t('subtitle')}</p>
        </div>

        <Card>
          <CardContent className="py-8">
            <Button
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={handleSignInWithGoogle}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('signInWithGoogle')}
            </Button>
            {error && (
              <p className="mt-4 text-center text-sm text-red-500">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
