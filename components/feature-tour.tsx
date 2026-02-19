'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Sparkles, Wine, Heart, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_COMPLETED_KEY = 'winejourney_tour_completed';

const TOUR_STEPS = [
  { id: 'search', icon: Search, color: 'bg-bordeaux-500' },
  { id: 'sommelier', icon: Sparkles, color: 'bg-garnet-500' },
  { id: 'cellar', icon: Wine, color: 'bg-ruby-500' },
  { id: 'enjoy', icon: Heart, color: 'bg-copper-500' },
] as const;

interface FeatureTourProps {
  force?: boolean;
  onComplete?: () => void;
}

export function FeatureTour({ force, onComplete }: FeatureTourProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const t = useTranslations('tour');

  useEffect(() => {
    if (force) {
      setShow(true);
      setStep(0);
      return;
    }
    try {
      if (localStorage.getItem(TOUR_COMPLETED_KEY) !== 'true') {
        const timer = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(timer);
      }
    } catch { /* silent */ }
  }, [force]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setShow(false);
    try {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } catch { /* silent */ }
    onComplete?.();
  };

  if (!show) return null;

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-200"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-sm animate-in zoom-in-95 fade-in-0 duration-300">
        <div className="rounded-2xl bg-background shadow-lift overflow-hidden">
          {/* Header gradient */}
          <div className={cn('px-6 pt-8 pb-6 text-center', current.color)}>
            <button
              onClick={handleClose}
              className="absolute top-3 end-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 mx-auto mb-4">
              <Icon className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-white">
              {t(`step_${current.id}_title`)}
            </h2>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-sm text-muted-foreground leading-relaxed text-center">
              {t(`step_${current.id}_desc`)}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    i === step ? 'w-6 bg-primary' : 'w-2 bg-muted'
                  )}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              {isLast ? t('getStarted') : t('next')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
  } catch {
    return true;
  }
}

export function resetTour(): void {
  try {
    localStorage.removeItem(TOUR_COMPLETED_KEY);
  } catch { /* silent */ }
}
