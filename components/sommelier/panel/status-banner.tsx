'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { PrecisionMeter } from '../precision-meter';
import { Sparkles, GraduationCap, CheckCircle2, ClipboardList, Heart, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

function JourneyProgress({ phase, hasDiscoveryData, likedWinesCount }: { phase: string; hasDiscoveryData: boolean; likedWinesCount: number }) {
  const t = useTranslations('sommelier');

  const steps = [
    { key: 'quiz', label: t('journeyQuiz'), done: hasDiscoveryData, icon: ClipboardList },
    { key: 'like', label: t('journeyLike'), done: likedWinesCount >= 1, icon: Heart },
    { key: 'deep', label: t('journeyDeep'), done: phase === 'personalization', icon: Zap },
  ];

  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
                step.done
                  ? 'bg-bordeaux-500 border-bordeaux-500 text-white'
                  : 'bg-background border-border text-muted-foreground'
              )}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 text-center leading-tight">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'h-0.5 w-full -mt-4 mx-0.5 rounded-full transition-colors',
                step.done ? 'bg-bordeaux-400' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusBanner() {
  const { phase, precision, hasDiscoveryData, likedWinesCount, setActiveFlow } = useSommelier();
  const t = useTranslations('sommelier');

  if (phase === 'discovery' && !hasDiscoveryData) {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 border border-blue-100/50 dark:border-blue-900/30">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('bannerDiscoveryPre')}</p>
          </div>
        </div>
        <button
          onClick={() => setActiveFlow('discovery')}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {t('startTasteMapping')}
        </button>
        <JourneyProgress phase={phase} hasDiscoveryData={hasDiscoveryData} likedWinesCount={likedWinesCount} />
      </div>
    );
  }

  if (phase === 'discovery' && hasDiscoveryData) {
    return (
      <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 p-4 border border-emerald-100/50 dark:border-blue-900/30">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('bannerDiscoveryPost')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('bannerDiscoveryPostHint')}</p>
          </div>
        </div>
        <JourneyProgress phase={phase} hasDiscoveryData={hasDiscoveryData} likedWinesCount={likedWinesCount} />
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
            <p className="text-xs text-muted-foreground mt-0.5">{t('bannerLearningHint')}</p>
            <PrecisionMeter value={precision} className="mt-2" />
          </div>
        </div>
        <JourneyProgress phase={phase} hasDiscoveryData={hasDiscoveryData} likedWinesCount={likedWinesCount} />
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
