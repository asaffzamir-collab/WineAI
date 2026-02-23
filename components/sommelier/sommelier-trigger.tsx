'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';

/**
 * Full-body sommelier character: bearded man with wavy brown hair,
 * white dress shirt, charcoal vest, bordeaux bow tie, burgundy trousers,
 * dark shoes, holding up a wine glass. Flat vector illustration style.
 */
export function PierCharacter({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── Head group (scaled down ~18% for better body proportions) ── */}
      <g transform="translate(40, 28) scale(0.82) translate(-40, -28)">
        {/* Hair (back volume) */}
        <ellipse cx="40" cy="22" rx="14" ry="15" fill="#5C3220" />
        <path d="M26 18c0-9 6-16 14-16s14 7 14 16c0 1-.2 2.5-.6 3.5C51 15 46 11.5 40 11.5S29 15 26.6 21.5C26.2 20.5 26 19 26 18z" fill="#3D1E10" />
        {/* Head / face */}
        <ellipse cx="40" cy="28" rx="11" ry="12.5" fill="#E8C4A0" />
        {/* Hair on top (wavy volume) */}
        <path d="M28 20c1-7 6-12 12-12s11 5 12 12c0 0-3-6-12-6S28 20 28 20z" fill="#5C3220" />
        <path d="M30 17c2-5 5-8 10-8s8 3 10 8c-2-3-5-5-10-5S32 14 30 17z" fill="#6B3A24" />
        {/* Side hair */}
        <path d="M28 22c-1 3-1 5 0 8 0-3 1-5 2-7z" fill="#5C3220" />
        <path d="M52 22c1 3 1 5 0 8 0-3-1-5-2-7z" fill="#5C3220" />
        {/* Eyebrows */}
        <path d="M33 24c1-1.2 3-1.5 4.5-0.8" stroke="#3D1E10" strokeWidth="0.8" strokeLinecap="round" fill="none" />
        <path d="M43 23.2c1.5-0.7 3.5-0.4 4.5 0.8" stroke="#3D1E10" strokeWidth="0.8" strokeLinecap="round" fill="none" />
        {/* Eyes */}
        <ellipse cx="36" cy="27" rx="1.5" ry="1.8" fill="#3D1E10" />
        <ellipse cx="44" cy="27" rx="1.5" ry="1.8" fill="#3D1E10" />
        <circle cx="36.5" cy="26.5" r="0.5" fill="white" />
        <circle cx="44.5" cy="26.5" r="0.5" fill="white" />
        {/* Nose */}
        <path d="M40 29c0 0-1 2.5-0.2 3.5c0.5 0.6 1.5 0.5 1.8 0C42.2 31.5 40 29 40 29z" fill="#D4A87A" />
        {/* Beard */}
        <path d="M31 32c0 0 1 8 9 9s9-9 9-9c-1 3-4 7-9 7S32 35 31 32z" fill="#5C3220" />
        <path d="M32 31c0 0 0.5 6 8 7s8-7 8-7c-1 2.5-3.5 5.5-8 5.5S33 33.5 32 31z" fill="#6B3A24" />
        {/* Smile */}
        <path d="M37 33c0 0 1.5 1.5 3 1.5s3-1.5 3-1.5" stroke="#E8C4A0" strokeWidth="0.6" strokeLinecap="round" fill="none" />
        {/* Mustache */}
        <path d="M35 31c0 0 2.5 1.5 5 0" stroke="#3D1E10" strokeWidth="1" strokeLinecap="round" fill="none" />
        <path d="M40 31c0 0 2.5 1.5 5 0" stroke="#3D1E10" strokeWidth="1" strokeLinecap="round" fill="none" />
      </g>

      {/* ── Neck ── */}
      <rect x="37" y="37" width="6" height="7" rx="1" fill="#E8C4A0" />

      {/* ── Shirt collar ── */}
      <path d="M34 44l6 4 6-4v3l-6 5-6-5z" fill="#F5F0E8" />

      {/* ── Shirt body ── */}
      <path d="M35 48v28h10V48c-1.5-1-3.5-1.5-5-1.5S36.5 47 35 48z" fill="#F5F0E8" />
      {/* Shirt buttons */}
      <circle cx="40" cy="56" r="0.7" fill="#D4CFC5" />
      <circle cx="40" cy="61" r="0.7" fill="#D4CFC5" />
      <circle cx="40" cy="66" r="0.7" fill="#D4CFC5" />

      {/* ── Vest ── */}
      <path d="M28 50c0-4 5-7 12-7s12 3 12 7v28H28V50z" fill="#3E3E42" />
      {/* Vest opening to show shirt */}
      <path d="M35 47v31h10V47c-1.5-1-3.5-2-5-2S36.5 46 35 47z" fill="#F5F0E8" />
      {/* Vest lapels */}
      <path d="M35 47L28 52v26h5V50z" fill="#3E3E42" />
      <path d="M45 47l7 5v26h-5V50z" fill="#3E3E42" />
      {/* Vest edge highlight */}
      <path d="M33 50v28" stroke="#4A4A50" strokeWidth="0.5" />
      <path d="M47 50v28" stroke="#4A4A50" strokeWidth="0.5" />
      {/* Pocket detail */}
      <path d="M29.5 60h4" stroke="#4A4A50" strokeWidth="0.5" />
      <path d="M46.5 60h4" stroke="#4A4A50" strokeWidth="0.5" />

      {/* ── Bow tie ── */}
      <path d="M36 47l4 2.5 4-2.5-4-2-4 2z" fill="#7A2D4A" />
      <circle cx="40" cy="47" r="1.2" fill="#9A4D6A" />

      {/* ── Left arm (relaxed, slightly out) ── */}
      <path d="M28 52c-3 2-6 8-7 14s-1 10 0 12c1-2 2-8 3-12s3-10 4-14z" fill="#3E3E42" />
      {/* Left hand */}
      <ellipse cx="21" cy="79" rx="3" ry="2.5" fill="#E8C4A0" />

      {/* ── Right arm (raised, holding wine glass) ── */}
      <path d="M52 52c3-1 8-6 12-10s6-6 6-8c-2 1-5 4-8 7s-7 8-10 11z" fill="#3E3E42" />
      {/* Right forearm / shirt sleeve visible */}
      <path d="M64 34c2-2 3-3 4-4" stroke="#F5F0E8" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right hand */}
      <ellipse cx="68" cy="30" rx="2.5" ry="2" fill="#E8C4A0" />

      {/* ── Wine glass ── */}
      <g transform="translate(66, 14)">
        {/* Stem */}
        <line x1="0" y1="8" x2="0" y2="16" stroke="#C8C0B0" strokeWidth="1" />
        {/* Base */}
        <ellipse cx="0" cy="16" rx="3" ry="1" fill="#C8C0B0" />
        {/* Bowl */}
        <path d="M-4 0c0 5 1.8 8 4 8s4-3 4-8z" fill="#C8C0B0" opacity="0.3" />
        <path d="M-4 0c0 5 1.8 8 4 8s4-3 4-8" stroke="#C8C0B0" strokeWidth="0.7" fill="none" />
        {/* Wine inside */}
        <path d="M-3 2c0 3.5 1.3 5.5 3 5.5s3-2 3-5.5z" fill="#7A2D4A" opacity="0.6" />
      </g>

      {/* ── Trousers ── */}
      <path d="M30 78h20v35c0 2-3 3-5 3h-2V83h-6v33h-2c-2 0-5-1-5-3V78z" fill="#5A2030" />
      {/* Trouser seam */}
      <line x1="40" y1="78" x2="40" y2="83" stroke="#4A1A2E" strokeWidth="0.5" />
      {/* Left leg */}
      <path d="M30 78v33c0 2 2 3 4 3h3V78H30z" fill="#5A2030" />
      {/* Right leg */}
      <path d="M43 78v33c0 2 2 3 4 3h3V78H43z" fill="#5A2030" />

      {/* ── Shoes ── */}
      <path d="M29 112c0 2 1 4 4 4h5c1 0 2-0.5 2-2v-2H29z" fill="#2C2C30" rx="2" />
      <path d="M42 112c0 2 1 4 4 4h5c1 0 2-0.5 2-2v-2H42z" fill="#2C2C30" rx="2" />
      {/* Shoe soles */}
      <path d="M28 115h13" stroke="#1A1A1E" strokeWidth="1" strokeLinecap="round" />
      <path d="M41 115h13" stroke="#1A1A1E" strokeWidth="1" strokeLinecap="round" />

      {/* ── Shadow on ground ── */}
      <ellipse cx="40" cy="118" rx="18" ry="3" fill="#000" opacity="0.06" />
    </svg>
  );
}

/** Pier head only — used for small avatars in chat bubbles */
export function PierHeadAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="16" cy="16" r="16" fill="#7A2D4A" />
      <ellipse cx="16" cy="15" rx="8" ry="9" fill="#E8C4A0" />
      <path d="M8 10c1-5 4-8 8-8s7 3 8 8c-2-3-4-5-8-5S10 7 8 10z" fill="#5C3220" />
      <path d="M10 9c1.5-3.5 3.5-5.5 6-5.5s4.5 2 6 5.5c-1.5-2-3-3.5-6-3.5S11.5 7 10 9z" fill="#6B3A24" />
      <ellipse cx="13" cy="14" rx="1.2" ry="1.4" fill="#3D1E10" />
      <ellipse cx="19" cy="14" rx="1.2" ry="1.4" fill="#3D1E10" />
      <circle cx="13.4" cy="13.5" r="0.4" fill="white" />
      <circle cx="19.4" cy="13.5" r="0.4" fill="white" />
      <path d="M13 18c0 0 1.5 2 3 2s3-2 3-2" stroke="#E8C4A0" strokeWidth="0.5" strokeLinecap="round" fill="none" />
      <path d="M12 17c0 0 2 1.5 4 0" stroke="#3D1E10" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M16 17c0 0 2 1.5 4 0" stroke="#3D1E10" strokeWidth="0.8" strokeLinecap="round" fill="none" />
      <path d="M10 19c0 0 1 5.5 6 6.5s6-6.5 6-6.5c-.5 2-3 5-6 5S10.5 21 10 19z" fill="#5C3220" />
      {/* Vest collar hint */}
      <path d="M10 26l6 4 6-4" stroke="#3E3E42" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Bow tie hint */}
      <circle cx="16" cy="28" r="1" fill="#7A2D4A" />
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
    <div
      className={cn(
        'fixed z-40 flex flex-col items-end',
        'right-4 bottom-[76px]',
        'md:right-6 md:bottom-6',
        isOpen && 'scale-0 opacity-0 pointer-events-none',
      )}
      onMouseEnter={() => setShowHoverTooltip(true)}
      onMouseLeave={() => setShowHoverTooltip(false)}
    >
      {/* Coach mark tooltip (first-visit) — absolute so it doesn't shift layout */}
      {showCoachMark && !isOpen && (
        <div className="absolute bottom-full mb-2 end-0 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 z-20">
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

      {/* Hover tooltip — absolute positioned, no layout shift */}
      {showHoverTooltip && !showCoachMark && !isOpen && (
        <div className="absolute bottom-full mb-2 end-0 animate-in fade-in-0 duration-150 z-20 pointer-events-none">
          <div className="rounded-xl bg-charcoal-800 dark:bg-charcoal-700 px-3 py-2 text-white shadow-lift max-w-[220px]">
            <p className="text-xs leading-relaxed">{t('pierHoverTooltip')}</p>
          </div>
          <div className="absolute -bottom-1.5 end-5 h-3 w-3 rotate-45 bg-charcoal-800 dark:bg-charcoal-700" />
        </div>
      )}

      {/* Pier character as the entire clickable FAB */}
      <button
        onClick={handleClick}
        aria-label={t('fabLabel')}
        className={cn(
          'relative flex flex-col items-center transition-all duration-200 ease-premium',
          'hover:scale-110 active:scale-95 focus:outline-none',
        )}
      >
        {showPulse && (
          <span className="absolute inset-0 m-auto w-14 h-14 rounded-full animate-ping bg-garnet-400/30 pointer-events-none" />
        )}

        <PierCharacter className="w-14 h-28 drop-shadow-lg relative z-10" />

        {isPreOnboarding && (
          <span className="mt-[-2px] text-xs font-semibold text-bordeaux-600 dark:text-bordeaux-300 whitespace-nowrap bg-background/80 rounded-full px-2 py-0.5 shadow-sm relative z-10">
            {t('fabLabel')}
          </span>
        )}
      </button>
    </div>
  );
}
