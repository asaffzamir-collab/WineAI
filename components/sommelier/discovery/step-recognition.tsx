'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { DiscoveryData } from '@/lib/sommelier-types';
import { WINE_STYLES } from '@/lib/sommelier-types';
import { cn } from '@/lib/utils';
import { Wine } from 'lucide-react';

interface Props {
  data: DiscoveryData;
  onNext: (updates: Partial<DiscoveryData>) => void;
}

export function StepRecognition({ data, onNext }: Props) {
  const t = useTranslations('sommelier');
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>(data.recognized_styles || []);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const typeColor: Record<string, string> = {
    red: 'bg-bordeaux-100 text-bordeaux-600 dark:bg-bordeaux-900/30 dark:text-bordeaux-300',
    white: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    rose: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300',
  };

  return (
    <div className="flex flex-col pt-6">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">
        {t('recognitionTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6">
        {t('recognitionSubtitle')}
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {WINE_STYLES.map(style => {
          const isSelected = selected.includes(style.id);
          return (
            <button
              key={style.id}
              onClick={() => toggle(style.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border-2 p-3 transition-all text-start',
                isSelected
                  ? 'border-bordeaux-500 bg-bordeaux-50/50 dark:bg-bordeaux-900/20 shadow-soft'
                  : 'border-border/50 hover:border-border active:scale-[0.97]'
              )}
            >
              <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', typeColor[style.type])}>
                <Wine className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium leading-tight">
                {locale === 'he' ? style.labelHe : style.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onNext({ recognized_styles: selected })}
        className="mt-6 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700"
      >
        {selected.length === 0 ? t('skipStep') : t('continue')}
      </button>
    </div>
  );
}
