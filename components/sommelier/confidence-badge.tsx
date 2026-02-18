'use client';

import { cn } from '@/lib/utils';
import type { ConfidenceLevel } from '@/lib/sommelier-types';
import { useTranslations } from 'next-intl';

const STYLES: Record<ConfidenceLevel, string> = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  early_learning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

export function ConfidenceBadge({ level, className }: { level: ConfidenceLevel; className?: string }) {
  const t = useTranslations('sommelier');
  const labels: Record<ConfidenceLevel, string> = {
    high: t('confidenceHigh'),
    medium: t('confidenceMedium'),
    early_learning: t('confidenceEarlyLearning'),
  };

  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', STYLES[level], className)}>
      {labels[level]}
    </span>
  );
}
