'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Wine, Search, ArrowRight } from 'lucide-react';

interface Props {
  displayName: string | null;
}

export function SommelierWelcome({ displayName }: Props) {
  const router = useRouter();
  const t = useTranslations('sommelier');
  const tOnboarding = useTranslations('onboarding');

  const handleStart = async () => {
    await fetch('/api/onboarding/complete', { method: 'POST' });
    router.replace('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-bordeaux-600 via-bordeaux-700 to-bordeaux-900 px-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
        <Wine className="h-10 w-10 text-copper-300" strokeWidth={1.5} />
      </div>

      <h1 className="font-serif text-3xl font-bold text-white mb-3">
        {displayName ? t('welcomeHello', { name: displayName }) : t('welcomeTitle')}
      </h1>

      <p className="text-lg text-bordeaux-200 mb-2">{t('welcomeHeadline')}</p>
      <p className="text-sm text-bordeaux-300/80 max-w-sm leading-relaxed mb-4">
        {tOnboarding('welcomeBody')}
      </p>
      <p className="text-sm text-bordeaux-300/80 max-w-sm leading-relaxed mb-12">
        {tOnboarding('welcomeValue')}
      </p>

      <button
        onClick={handleStart}
        className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-bordeaux-700 shadow-lift transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <Search className="h-5 w-5" strokeWidth={1.5} />
        {tOnboarding('findFirstWine')}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
