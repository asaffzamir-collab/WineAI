'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { PrecisionMeter } from '../precision-meter';
import { ClipboardList, Heart, Zap, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SommelierPhase } from '@/lib/sommelier-types';

const PHASES: { key: SommelierPhase; labelKey: string; icon: React.ElementType }[] = [
  { key: 'discovery', labelKey: 'journeyQuiz', icon: ClipboardList },
  { key: 'learning', labelKey: 'journeyLike', icon: Heart },
  { key: 'personalization', labelKey: 'journeyDeep', icon: Zap },
];

const PHASE_ORDER: Record<SommelierPhase, number> = {
  discovery: 0,
  learning: 1,
  personalization: 2,
};

function PhaseSelector({
  phase,
  maxUnlockedPhase,
  onSelect,
}: {
  phase: SommelierPhase;
  maxUnlockedPhase: SommelierPhase;
  onSelect: (p: SommelierPhase) => void;
}) {
  const t = useTranslations('sommelier');
  const activeIdx = PHASE_ORDER[phase];
  const maxIdx = PHASE_ORDER[maxUnlockedPhase];

  return (
    <div className="flex items-center mt-3">
      {PHASES.map((step, i) => {
        const isActive = step.key === phase;
        const isUnlocked = i <= maxIdx;
        const isReached = i <= activeIdx;
        const Icon = isUnlocked ? step.icon : Lock;

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => isUnlocked && onSelect(step.key)}
              disabled={!isUnlocked}
              className={cn(
                'flex flex-col items-center flex-1 min-w-0 group',
                isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed opacity-40',
              )}
            >
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all flex-shrink-0',
                isActive
                  ? 'bg-bordeaux-500 border-bordeaux-500 text-white scale-110 shadow-sm'
                  : isReached
                    ? 'bg-bordeaux-500 border-bordeaux-500 text-white'
                    : isUnlocked
                      ? 'bg-background border-border text-muted-foreground group-hover:border-bordeaux-300 group-hover:text-bordeaux-400'
                      : 'bg-muted border-border text-muted-foreground',
              )}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              </div>
              <span className={cn(
                'text-[10px] mt-1 text-center leading-tight transition-colors truncate w-full px-0.5',
                isActive
                  ? 'font-semibold text-bordeaux-600 dark:text-bordeaux-300'
                  : isUnlocked
                    ? 'text-muted-foreground group-hover:text-foreground'
                    : 'text-muted-foreground/60',
              )}>
                {t(step.labelKey)}
              </span>
            </button>
            {i < PHASES.length - 1 && (
              <div className={cn(
                'h-0.5 w-full -mt-4 mx-1 rounded-full transition-colors flex-shrink-0',
                isReached && i < activeIdx ? 'bg-bordeaux-400' : 'bg-border',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StatusBanner() {
  const { phase, maxUnlockedPhase, setPhase, precision } = useSommelier();
  const t = useTranslations('sommelier');

  return (
    <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-ivory-50 to-stone-50 dark:from-charcoal-800/50 dark:to-charcoal-900/50 p-4 border border-border/50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {phase === 'discovery' && t('bannerDiscovery')}
            {phase === 'learning' && t('bannerLearning', { precision })}
            {phase === 'personalization' && t('bannerPersonalized')}
          </p>
          {precision > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <PrecisionMeter value={precision} className="flex-1" />
              <span className="text-xs font-medium text-bordeaux-600 dark:text-bordeaux-300 flex-shrink-0">
                {precision}%
              </span>
            </div>
          )}
        </div>
      </div>
      <PhaseSelector phase={phase} maxUnlockedPhase={maxUnlockedPhase} onSelect={setPhase} />
    </div>
  );
}
