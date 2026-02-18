'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { PrecisionMeter } from '../precision-meter';
import { Sparkles, GraduationCap, CheckCircle2 } from 'lucide-react';

export function StatusBanner() {
  const { phase, precision, setActiveFlow } = useSommelier();
  const t = useTranslations('sommelier');

  if (phase === 'discovery') {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 border border-blue-100/50 dark:border-blue-900/30">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('bannerDiscovery')}</p>
          </div>
        </div>
        <button
          onClick={() => setActiveFlow('discovery')}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {t('startTasteMapping')}
        </button>
      </div>
    );
  }

  if (phase === 'learning') {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 border border-amber-100/50 dark:border-amber-900/30">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t('bannerLearning', { precision })}
            </p>
            <PrecisionMeter value={precision} className="mt-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 border border-emerald-100/50 dark:border-emerald-900/30">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{t('bannerPersonalized')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('precisionLabel', { precision })}</p>
        </div>
      </div>
    </div>
  );
}
