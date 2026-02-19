'use client';

import { cn } from '@/lib/utils';

interface PrecisionMeterProps {
  value: number;
  className?: string;
}

export function PrecisionMeter({ value, className }: PrecisionMeterProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-2.5 w-full rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-l from-bordeaux-500 to-bordeaux-400 transition-all duration-1000 ease-premium shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
