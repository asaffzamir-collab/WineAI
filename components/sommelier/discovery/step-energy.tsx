'use client';

import { useTranslations } from 'next-intl';
import type { DiscoveryData } from '@/lib/sommelier-types';
import { cn } from '@/lib/utils';
import { Flame, Leaf } from 'lucide-react';

interface Props {
  data: DiscoveryData;
  onNext: (updates: Partial<DiscoveryData>) => void;
}

export function StepEnergy({ onNext }: Props) {
  const t = useTranslations('sommelier');

  const select = (energy: DiscoveryData['energy']) => {
    onNext({ energy });
  };

  return (
    <div className="flex flex-col items-center pt-6">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">
        {t('energyTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-[280px]">
        {t('energySubtitle')}
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <button
          onClick={() => select('bold_structured')}
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border-2 border-border/50 p-6 transition-all',
            'hover:border-bordeaux-400 hover:shadow-soft active:scale-[0.97]'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30">
            <Flame className="h-7 w-7 text-bordeaux-500" />
          </div>
          <span className="text-sm font-semibold text-foreground text-center">{t('energyBold')}</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight">{t('energyBoldDesc')}</span>
        </button>

        <button
          onClick={() => select('fresh_vibrant')}
          className={cn(
            'flex flex-col items-center gap-3 rounded-2xl border-2 border-border/50 p-6 transition-all',
            'hover:border-olive-400 hover:shadow-soft active:scale-[0.97]'
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <Leaf className="h-7 w-7 text-emerald-600" />
          </div>
          <span className="text-sm font-semibold text-foreground text-center">{t('energyFresh')}</span>
          <span className="text-[11px] text-muted-foreground text-center leading-tight">{t('energyFreshDesc')}</span>
        </button>
      </div>

      <button
        onClick={() => select('both')}
        className="mt-6 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
      >
        {t('energyBoth')}
      </button>
    </div>
  );
}
