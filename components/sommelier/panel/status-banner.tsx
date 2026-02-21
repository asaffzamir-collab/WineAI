'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { PrecisionMeter } from '../precision-meter';
import { MessageCircle, Sparkles, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatusBanner() {
  const { likedWinesCount, precision } = useSommelier();
  const t = useTranslations('sommelier');

  const hasFullAccess = likedWinesCount >= 2;
  const remaining = Math.max(0, 2 - likedWinesCount);

  return (
    <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-ivory-50 to-stone-50 dark:from-charcoal-800/50 dark:to-charcoal-900/50 p-4 border border-border/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {hasFullAccess ? t('bannerPersonalized') : t('bannerBasic')}
          </p>
          {precision > 0 && (
            <div className="flex items-center gap-3 mt-2.5">
              <span className="text-sm font-bold text-bordeaux-600 dark:text-bordeaux-300 tabular-nums flex-shrink-0">
                {precision}%
              </span>
              <PrecisionMeter value={precision} className="flex-1" />
            </div>
          )}
        </div>
      </div>

      {/* Two-tier progress */}
      <div className="relative mt-4 flex justify-around items-start px-4">
        <div
          className="absolute top-[14px] z-0"
          style={{ left: 'calc(25%)', right: 'calc(25%)' }}
        >
          <div className="relative h-0.5 w-full rounded-full bg-border">
            <div
              className="absolute inset-y-0 start-0 rounded-full bg-bordeaux-400 transition-all duration-500"
              style={{ width: hasFullAccess ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Basic tier */}
        <div className="relative z-10 flex flex-col items-center w-[80px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 bg-bordeaux-500 border-bordeaux-500 text-white">
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
          </div>
          <span className="text-[10px] mt-1.5 text-center leading-tight font-semibold text-bordeaux-600 dark:text-bordeaux-300">
            {t('tierBasic')}
          </span>
        </div>

        {/* Full tier */}
        <div className="relative z-10 flex flex-col items-center w-[80px]">
          <div className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all',
            hasFullAccess
              ? 'bg-bordeaux-500 border-bordeaux-500 text-white scale-110 shadow-sm'
              : 'bg-muted border-border text-muted-foreground',
          )}>
            {hasFullAccess ? (
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
            ) : (
              <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />
            )}
          </div>
          <span className={cn(
            'text-[10px] mt-1.5 text-center leading-tight',
            hasFullAccess
              ? 'font-semibold text-bordeaux-600 dark:text-bordeaux-300'
              : 'text-muted-foreground/60',
          )}>
            {t('tierFull')}
          </span>
          {!hasFullAccess && remaining > 0 && (
            <span className="text-[9px] mt-0.5 text-muted-foreground">
              {t('tierUnlockHint', { count: remaining })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
