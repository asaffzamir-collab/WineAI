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
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-bordeaux-400 to-bordeaux-600 transition-all duration-1000 ease-premium"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
