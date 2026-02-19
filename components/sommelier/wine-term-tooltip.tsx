'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WineTermTooltipProps {
  explanation: string;
  className?: string;
}

export function WineTermTooltip({ explanation, className }: WineTermTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className={cn('inline-flex items-center', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute z-10 mt-1 top-full start-0 end-0 rounded-lg bg-charcoal-800 dark:bg-charcoal-700 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lift animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {explanation}
        </span>
      )}
    </span>
  );
}
