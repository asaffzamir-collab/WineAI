'use client';

import { useTranslations } from 'next-intl';
import { RadarChart } from '../radar-chart';
import { Sparkles } from 'lucide-react';

interface Props {
  radar: { body: number; tannin: number; sweetness: number; acidity: number };
  traits: string[];
  insight: string;
}

export function Phase2Unlock({ radar, traits, insight }: Props) {
  const t = useTranslations('sommelier');

  return (
    <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-b from-emerald-50/80 to-background dark:from-emerald-950/20 p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-foreground">{t('phase2UnlockTitle')}</h3>
      </div>

      <div className="flex justify-center mb-4">
        <RadarChart values={radar} size={160} color="rgb(16, 185, 129)" />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {traits.map(trait => (
          <span key={trait} className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {trait}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">{insight}</p>
    </div>
  );
}
