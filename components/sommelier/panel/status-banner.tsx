'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { PrecisionMeter } from '../precision-meter';
import { Heart } from 'lucide-react';

export function StatusBanner() {
  const { likedWinesCount, precision } = useSommelier();
  const t = useTranslations('sommelier');

  const hasFullAccess = likedWinesCount >= 2;

  if (hasFullAccess) return null;

  const remaining = Math.max(0, 2 - likedWinesCount);

  return (
    <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-ivory-50 to-stone-50 dark:from-charcoal-800/50 dark:to-charcoal-900/50 p-4 border border-border/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bordeaux-500/10 flex-shrink-0">
          <Heart className="h-4 w-4 text-bordeaux-500" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('bannerLearningTitle')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('bannerLearningDesc', { count: remaining })}
          </p>
        </div>
      </div>

      {precision > 0 && (
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm font-bold text-bordeaux-600 dark:text-bordeaux-300 tabular-nums flex-shrink-0">
            {precision}%
          </span>
          <PrecisionMeter value={precision} className="flex-1" />
        </div>
      )}
    </div>
  );
}
