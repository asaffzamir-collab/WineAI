'use client';

import { useTranslations } from 'next-intl';
import type { PreliminaryProfile } from '@/lib/sommelier-types';
import { Loader2 } from 'lucide-react';

interface Props {
  profile: PreliminaryProfile | null;
  loading: boolean;
  onComplete: (feedback: 'yes' | 'close' | 'not_really') => void;
}

export function FeedbackLoop({ profile, loading, onComplete }: Props) {
  const t = useTranslations('sommelier');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('adjustingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-12">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">
        {t('feedbackTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-[280px]">
        {t('feedbackSubtitle')}
      </p>

      <div className="w-full space-y-3 max-w-sm">
        <button
          onClick={() => onComplete('yes')}
          className="w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700"
        >
          {t('feedbackYes')}
        </button>
        <button
          onClick={() => onComplete('close')}
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {t('feedbackClose')}
        </button>
        <button
          onClick={() => onComplete('not_really')}
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent"
        >
          {t('feedbackNotReally')}
        </button>
      </div>
    </div>
  );
}
