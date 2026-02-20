'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';

function PierCharacter({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="24" cy="16" r="10" fill="#7A2D4A" />
      <path d="M14 14c0-6 4.5-10.5 10-10.5S34 8 34 14c0 1-0.3 2-0.8 2.8C32 13 28 11 24 11s-8 2-9.2 5.8C14.3 16 14 15 14 14z" fill="#4A1A2E" />
      <circle cx="24" cy="17" r="7.5" fill="#9A4D6A" />
      <circle cx="21" cy="15.5" r="1" fill="white" />
      <circle cx="27" cy="15.5" r="1" fill="white" />
      <path d="M21 19.5c0 0 1.5 2 3 2s3-2 3-2" stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M19.5 17.8c0 0 2 1.5 4.5 0.2M28.5 17.8c0 0-2 1.5-4.5 0.2" stroke="#4A1A2E" strokeWidth="0.7" strokeLinecap="round" fill="none" />
      <path d="M14 30c0-4 4.5-7 10-7s10 3 10 7v8H14v-8z" fill="#5A1E38" />
      <path d="M20 23v10h8V23c-1.3-0.7-2.6-1-4-1s-2.7 0.3-4 1z" fill="white" />
      <path d="M21 25l3 2 3-2-3-2-3 2z" fill="#7A2D4A" />
      <circle cx="24" cy="25" r="0.8" fill="#9A4D6A" />
      <path d="M20 23L14 30v8h4V26l2-3z" fill="#4A1A2E" opacity="0.3" />
      <path d="M28 23l6 7v8h-4V26l-2-3z" fill="#4A1A2E" opacity="0.3" />
      <g transform="translate(34, 30)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#9A4D6A" strokeWidth="1.2" />
        <ellipse cx="0" cy="0" rx="3.5" ry="5" fill="#9A4D6A" opacity="0.25" />
        <path d="M-3.5 0c0-3 1.5-5 3.5-5s3.5 2 3.5 5" stroke="#9A4D6A" strokeWidth="0.8" fill="none" />
        <ellipse cx="0" cy="-2" rx="2.5" ry="2" fill="#7A2D4A" opacity="0.4" />
        <line x1="-2.5" y1="10" x2="2.5" y2="10" stroke="#9A4D6A" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const COACH_MARK_KEY = 'winejourney_sommelier_coach_seen';
const PULSE_COUNT_KEY = 'winejourney_sommelier_pulse_count';
const MAX_PULSE_VISITS = 3;

export function SommelierTrigger() {
  const { toggle, isOpen, phase } = useSommelier();
  const t = useTranslations('sommelier');
  const [showCoachMark, setShowCoachMark] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
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
      'fixed z-40 flex flex-col items-end',
      'right-4 bottom-[76px]',
      'md:right-6 md:bottom-6',
      isOpen && 'scale-0 opacity-0 pointer-events-none'
    )}>
      {/* Coach mark tooltip (first-visit) */}
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

      {/* Hover tooltip */}
      {showHoverTooltip && !showCoachMark && !isOpen && (
        <div className="relative animate-in fade-in-0 slide-in-from-bottom-2 duration-150 mb-1">
          <div className="rounded-xl bg-charcoal-800 dark:bg-charcoal-700 px-3 py-2 text-white shadow-lift max-w-[220px]">
            <p className="text-xs leading-relaxed">{t('pierHoverTooltip')}</p>
          </div>
          <div className="absolute -bottom-1.5 end-5 h-3 w-3 rotate-45 bg-charcoal-800 dark:bg-charcoal-700" />
        </div>
      )}

      {/* Pier character as the entire clickable FAB */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowHoverTooltip(true)}
        onMouseLeave={() => setShowHoverTooltip(false)}
        aria-label={t('fabLabel')}
        className={cn(
          'relative flex flex-col items-center transition-all duration-200 ease-premium',
          'hover:scale-110 active:scale-95 focus:outline-none',
          isPreOnboarding ? 'gap-0' : '',
        )}
      >
        {/* Pulse ring behind Pier */}
        {showPulse && (
          <span className="absolute inset-0 m-auto w-16 h-16 rounded-full animate-ping bg-garnet-400/30 pointer-events-none" />
        )}

        <PierCharacter className="w-16 h-20 drop-shadow-lg relative z-10" />

        {isPreOnboarding && (
          <span className="mt-[-2px] text-xs font-semibold text-bordeaux-600 dark:text-bordeaux-300 whitespace-nowrap bg-background/80 rounded-full px-2 py-0.5 shadow-sm relative z-10">
            {t('fabLabel')}
          </span>
        )}
      </button>
    </div>
  );
}
