'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/user-context';
import { Search, ArrowRight } from 'lucide-react';
import { PierCharacter } from './sommelier-trigger';

interface Props {
  displayName: string | null;
}

export function SommelierWelcome({ displayName }: Props) {
  const router = useRouter();
  const { gender } = useUser();
  const g = { gender };
  const t = useTranslations('sommelier');
  const tOnboarding = useTranslations('onboarding');

  const handleStart = async () => {
    await fetch('/api/onboarding/complete', { method: 'POST' });
    router.replace('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-bordeaux-600 via-bordeaux-700 to-bordeaux-900 px-6 text-center">
      <div className="mb-8">
        <PierCharacter className="h-28 w-28 rounded-2xl ring-2 ring-white/20 drop-shadow-lift" />
      </div>

      <h1 className="font-serif text-3xl font-bold text-white mb-3">
        {displayName ? t('welcomeHello', { name: displayName }) : t('welcomeTitle')}
      </h1>

      <p className="text-lg text-bordeaux-200 mb-2">{t('welcomeHeadline')}</p>
      <p className="text-sm text-bordeaux-300/80 max-w-sm leading-relaxed mb-4">
        {tOnboarding('welcomeBody', g)}
      </p>
      <p className="text-sm text-bordeaux-300/80 max-w-sm leading-relaxed mb-12">
        {tOnboarding('welcomeValue', g)}
      </p>

      <button
        onClick={handleStart}
        className="flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-bordeaux-700 shadow-lift transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <Search className="h-5 w-5" strokeWidth={1.5} />
        {tOnboarding('findFirstWine', g)}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
