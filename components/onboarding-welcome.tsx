'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Wine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingWelcomeProps {
  userId: string;
  displayName: string | null;
}

export function OnboardingWelcome({ userId: _userId, displayName }: OnboardingWelcomeProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const firstName = displayName?.trim() || null;
  const welcomeTitle = firstName ? t('welcomeTitle', { name: firstName }) : t('welcomeTitleFallback');

  const handleFindFirstWine = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to complete');
      router.push('/search');
    } catch {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-wine-900 to-wine-950 px-4 py-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Wine className="mx-auto mb-4 h-12 w-12 text-gold-500" />
          <h1 className="text-2xl font-bold text-white">{welcomeTitle}</h1>
        </div>

        <Card>
          <CardContent className="py-8 space-y-6">
            <p className="text-wine-900 text-center leading-relaxed">
              {t('welcomeBody')}
            </p>
            <p className="text-wine-700 text-center text-sm leading-relaxed">
              {t('welcomeValue')}
            </p>
            <Button
              className="w-full"
              disabled={isCompleting}
              onClick={handleFindFirstWine}
            >
              {isCompleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('findFirstWine')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
