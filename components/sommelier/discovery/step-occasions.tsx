'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { DiscoveryData } from '@/lib/sommelier-types';
import { OCCASIONS } from '@/lib/sommelier-types';
import { cn } from '@/lib/utils';
import { Utensils, Users, Star, Compass } from 'lucide-react';

const ICONS = [Utensils, Users, Star, Compass];

interface Props {
  data: DiscoveryData;
  onNext: (updates: Partial<DiscoveryData>) => void;
}

export function StepOccasions({ data, onNext }: Props) {
  const t = useTranslations('sommelier');
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>(data.occasions || []);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col pt-6">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">
        {t('occasionsTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t('occasionsSubtitle')}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {OCCASIONS.map((occ, i) => {
          const Icon = ICONS[i];
          const isSelected = selected.includes(occ.id);
          return (
            <button
              key={occ.id}
              onClick={() => toggle(occ.id)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                isSelected
                  ? 'border-bordeaux-500 bg-bordeaux-50 dark:bg-bordeaux-900/20 shadow-soft'
                  : 'border-border/50 hover:border-border active:scale-[0.97]'
              )}
            >
              <Icon className={cn('h-5 w-5', isSelected ? 'text-bordeaux-500' : 'text-muted-foreground')} strokeWidth={1.5} />
              <span className={cn('text-xs font-medium text-center', isSelected ? 'text-bordeaux-700 dark:text-bordeaux-300' : 'text-foreground')}>
                {locale === 'he' ? occ.labelHe : occ.labelEn}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onNext({ occasions: selected })}
        disabled={selected.length === 0}
        className="mt-8 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700 disabled:opacity-40"
      >
        {t('continue')}
      </button>
    </div>
  );
}
