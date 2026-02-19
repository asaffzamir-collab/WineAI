'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from './sommelier-context';
import { ClipboardList, Radar, Heart, Sparkles, ArrowLeft } from 'lucide-react';

const STEPS = [
  { icon: ClipboardList, titleKey: 'howStep1Title', descKey: 'howStep1Desc' },
  { icon: Radar, titleKey: 'howStep2Title', descKey: 'howStep2Desc' },
  { icon: Heart, titleKey: 'howStep3Title', descKey: 'howStep3Desc' },
  { icon: Sparkles, titleKey: 'howStep4Title', descKey: 'howStep4Desc' },
] as const;

export function HowItWorks() {
  const t = useTranslations('sommelier');
  const { setActiveFlow } = useSommelier();

  return (
    <div className="flex flex-col pt-4 px-4 pb-6">
      <button
        onClick={() => setActiveFlow(null)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">
        {t('howTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t('howSubtitle')}
      </p>

      <div className="relative space-y-6">
        {/* Connecting line */}
        <div className="absolute start-5 top-8 bottom-8 w-px bg-border" />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="relative flex items-start gap-4">
              <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 border-2 border-bordeaux-200 dark:border-bordeaux-800">
                <Icon className="h-5 w-5 text-bordeaux-600 dark:text-bordeaux-300" strokeWidth={1.5} />
              </div>
              <div className="pt-1.5">
                <p className="text-sm font-semibold text-foreground">{t(step.titleKey)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(step.descKey)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setActiveFlow(null)}
        className="mt-8 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700"
      >
        {t('done')}
      </button>
    </div>
  );
}
