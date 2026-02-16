'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { WineLogo } from '@/components/wine-logo';
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-wine-900 to-wine-950 px-4 py-8 flex flex-col items-center justify-center">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full border border-wine-700/20" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full border border-wine-700/15" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center">
          <WineLogo size={56} className="mx-auto mb-4 text-gold-500" />
          <h1 className="text-2xl font-bold text-white">{welcomeTitle}</h1>
          <p className="mt-2 text-sm text-wine-300">WineJourney</p>
        </div>

        <Card className="shadow-xl">
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
