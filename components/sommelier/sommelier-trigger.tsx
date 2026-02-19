'use client';

import { useEffect, useState } from 'react';
import { Wine, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';

const COACH_MARK_KEY = 'winejourney_sommelier_coach_seen';
const PULSE_COUNT_KEY = 'winejourney_sommelier_pulse_count';
const MAX_PULSE_VISITS = 3;

export function SommelierTrigger() {
  const { toggle, isOpen, phase } = useSommelier();
  const t = useTranslations('sommelier');
  const [showCoachMark, setShowCoachMark] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const isPreOnboarding = phase === 'discovery';

  useEffect(() => {
    const coachSeen = localStorage.getItem(COACH_MARK_KEY) === 'true';
    const pulseCount = parseInt(localStorage.getItem(PULSE_COUNT_KEY) || '0', 10);

    if (!coachSeen) {
      setShowCoachMark(true);
      const timer = setTimeout(() => {
        setShowCoachMark(false);
        localStorage.setItem(COACH_MARK_KEY, 'true');
      }, 6000);
      return () => clearTimeout(timer);
    }

    if (pulseCount < MAX_PULSE_VISITS) {
      setShowPulse(true);
      localStorage.setItem(PULSE_COUNT_KEY, String(pulseCount + 1));
    }
  }, []);

  const handleClick = () => {
    if (showCoachMark) {
      setShowCoachMark(false);
      localStorage.setItem(COACH_MARK_KEY, 'true');
    }
    setShowPulse(false);
    toggle();
  };

  return (
    <div className={cn(
      'fixed z-40 flex flex-col items-end gap-2',
      'right-4 bottom-[76px]',
      'md:right-6 md:bottom-6',
      isOpen && 'scale-0 opacity-0 pointer-events-none'
    )}>
      {/* Coach mark tooltip */}
      {showCoachMark && !isOpen && (
        <div className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-300 mb-1">
          <div className="flex items-start gap-2 rounded-xl bg-charcoal-800 dark:bg-charcoal-700 px-4 py-3 text-white shadow-lift max-w-[240px]">
            <p className="text-xs leading-relaxed">{t('coachMark')}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCoachMark(false);
                localStorage.setItem(COACH_MARK_KEY, 'true');
              }}
              className="flex-shrink-0 mt-0.5"
            >
              <X className="h-3.5 w-3.5 text-white/60 hover:text-white" />
            </button>
          </div>
          <div className="absolute -bottom-1.5 end-5 h-3 w-3 rotate-45 bg-charcoal-800 dark:bg-charcoal-700" />
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={handleClick}
        aria-label={t('fabLabel')}
        className={cn(
          'relative flex items-center justify-center shadow-lift transition-all duration-200 ease-premium',
          'bg-garnet-500 text-white hover:scale-105 active:scale-95',
          isPreOnboarding
            ? 'gap-2 rounded-full px-5 h-14 md:h-[60px]'
            : 'rounded-full h-14 w-14 md:h-[60px] md:w-[60px]',
        )}
      >
        {/* Pulse ring */}
        {showPulse && (
          <span className="absolute inset-0 rounded-full animate-ping bg-garnet-400/40 pointer-events-none" />
        )}

        <Wine className="h-6 w-6 relative z-10" strokeWidth={1.8} />
        {isPreOnboarding && (
          <span className="text-sm font-semibold whitespace-nowrap relative z-10">{t('fabLabel')}</span>
        )}
      </button>
    </div>
  );
}
