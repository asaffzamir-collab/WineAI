'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Minus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';

const PIER_MINIMIZED_KEY = 'winejourney_pier_minimized';

/** High-quality portrait of Pier the sommelier — used as the main trigger button. */
export function PierCharacter({ className }: { className?: string }) {
  return (
    <Image
      src="/images/pier-sommelier.png"
      alt="Pier the sommelier"
      width={120}
      height={120}
      className={cn('object-cover rounded-2xl', className)}
      priority
    />
  );
}

/** Pier head avatar — used for small avatars in chat bubbles and headers. */
export function PierHeadAvatar({ className }: { className?: string }) {
  return (
    <Image
      src="/images/pier-avatar.png"
      alt="Pier"
      width={48}
      height={48}
      className={cn('rounded-full object-cover', className)}
    />
  );
}

const COACH_MARK_KEY = 'winejourney_sommelier_coach_seen';

export function SommelierTrigger() {
  const { toggle, isOpen } = useSommelier();
  const t = useTranslations('sommelier');
  const [showCoachMark, setShowCoachMark] = useState(false);
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMinimized(localStorage.getItem(PIER_MINIMIZED_KEY) === 'true');
    const coachSeen = localStorage.getItem(COACH_MARK_KEY) === 'true';
    if (!coachSeen) {
      setShowCoachMark(true);
      const timer = setTimeout(() => {
        setShowCoachMark(false);
        localStorage.setItem(COACH_MARK_KEY, 'true');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClick = () => {
    if (showCoachMark) {
      setShowCoachMark(false);
      localStorage.setItem(COACH_MARK_KEY, 'true');
    }
    if (isMinimized) {
      setIsMinimized(false);
      localStorage.setItem(PIER_MINIMIZED_KEY, 'false');
      return;
    }
    toggle();
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(true);
    localStorage.setItem(PIER_MINIMIZED_KEY, 'true');
    setShowCoachMark(false);
    localStorage.setItem(COACH_MARK_KEY, 'true');
  };

  return (
    <div
      className={cn(
        'fixed z-40 flex flex-col items-end',
        'right-3 bottom-[100px]',
        'md:right-6 md:bottom-6',
        isOpen && 'scale-0 opacity-0 pointer-events-none',
        mounted ? 'animate-pier-entrance' : 'opacity-0',
      )}
      onMouseEnter={() => setShowHoverTooltip(true)}
      onMouseLeave={() => setShowHoverTooltip(false)}
    >
      {/* Coach mark tooltip (first-visit, expanded only) */}
      {showCoachMark && !isOpen && !isMinimized && (
        <div className="absolute bottom-full mb-3 end-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 z-20">
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
        <div className="absolute bottom-full mb-3 end-0 animate-in fade-in-0 duration-150 z-20 pointer-events-none">
          <div className="rounded-xl bg-charcoal-800 dark:bg-charcoal-700 px-3 py-2 text-white shadow-lift max-w-[220px]">
            <p className="text-xs leading-relaxed">{t('pierHoverTooltip')}</p>
          </div>
          <div className="absolute -bottom-1.5 end-5 h-3 w-3 rotate-45 bg-charcoal-800 dark:bg-charcoal-700" />
        </div>
      )}

      {/* Minimized state: small circular avatar (mobile only) */}
      {isMinimized ? (
        <button
          onClick={handleClick}
          aria-label={t('fabLabel')}
          className="relative flex items-center justify-center transition-all duration-200 ease-premium hover:scale-110 active:scale-95 focus:outline-none"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-bordeaux-500/90 to-bordeaux-700/90 dark:from-bordeaux-600/80 dark:to-bordeaux-800/80 animate-pier-glow scale-[1.15]" />
          <PierHeadAvatar className="h-12 w-12 rounded-full drop-shadow-lg relative z-10" />
        </button>
      ) : (
        <div className="relative">
          {/* Minimize button (mobile only) */}
          <button
            onClick={handleMinimize}
            className="md:hidden absolute -top-1 -end-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal-800/80 text-white/80 hover:bg-charcoal-700 hover:text-white transition-colors shadow-md"
            aria-label="Minimize"
          >
            <Minus className="h-3 w-3" />
          </button>

          {/* FAB with full Pier character and persistent label */}
          <button
            onClick={handleClick}
            aria-label={t('fabLabel')}
            className={cn(
              'relative flex flex-col items-center transition-all duration-200 ease-premium',
              'hover:scale-105 active:scale-95 focus:outline-none group animate-pier-float',
            )}
          >
            <div className="relative">
              <PierCharacter className="h-20 w-20 md:h-24 md:w-24 rounded-2xl drop-shadow-lift relative z-10" />
            </div>

            <span className="mt-1.5 text-[11px] font-bold tracking-wide text-white whitespace-nowrap bg-bordeaux-600 dark:bg-bordeaux-700 rounded-full px-2.5 py-0.5 shadow-md relative z-10 group-hover:bg-bordeaux-500 transition-colors">
              {t('askPierLabel')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
