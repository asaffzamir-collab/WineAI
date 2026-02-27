'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';

/** High-quality portrait of Pier the sommelier — used in welcome screens and panels. */
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

/** Pier head avatar — used for the FAB, chat bubbles, and headers. */
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const coachSeen = localStorage.getItem(COACH_MARK_KEY) === 'true';
    if (!coachSeen) {
      setShowCoachMark(true);
      const timer = setTimeout(() => {
        setShowCoachMark(false);
        localStorage.setItem(COACH_MARK_KEY, 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissCoachMark = () => {
    setShowCoachMark(false);
    localStorage.setItem(COACH_MARK_KEY, 'true');
  };

  const handleClick = () => {
    if (showCoachMark) dismissCoachMark();
    toggle();
  };

  return (
    <div
      className={cn(
        'fixed z-40 flex items-end gap-2',
        'right-4 bottom-[76px]',
        'md:right-6 md:bottom-6',
        isOpen && 'scale-0 opacity-0 pointer-events-none',
        mounted ? 'animate-pier-entrance' : 'opacity-0',
      )}
    >
      {/* Coach mark chip — tapping anywhere on it dismisses it */}
      {showCoachMark && !isOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissCoachMark();
          }}
          className="animate-in fade-in-0 slide-in-from-end-2 duration-300 flex items-center gap-2 rounded-xl bg-charcoal-800 dark:bg-charcoal-700 px-3 py-2.5 text-white shadow-lift max-w-[200px] cursor-pointer"
        >
          <p className="text-xs leading-relaxed flex-1 text-start">{t('coachMark')}</p>
          <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-3.5 w-3.5 text-white/60" />
          </span>
        </button>
      )}

      {/* Compact circular FAB */}
      <button
        onClick={handleClick}
        aria-label={t('fabLabel')}
        className={cn(
          'relative flex-shrink-0 flex items-center justify-center',
          'h-14 w-14 rounded-full shadow-lift',
          'bg-bordeaux-600 dark:bg-bordeaux-700',
          'transition-all duration-200 ease-premium',
          'hover:scale-105 hover:shadow-xl active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-bordeaux-400 focus-visible:ring-offset-2',
        )}
      >
        <PierHeadAvatar className="h-11 w-11 rounded-full" />
      </button>
    </div>
  );
}
