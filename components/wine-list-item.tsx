'use client';

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WineListItemProps {
  name: string;
  winery: string;
  metadata?: { label: string; value: string }[];
  onClick?: () => void;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  className?: string;
}

export function WineListItem({
  name,
  winery,
  metadata,
  onClick,
  trailing,
  leading,
  className,
}: WineListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl bg-white p-3.5 text-left shadow-soft',
        'hover:shadow-soft-lg hover:translate-y-[-1px] transition-all duration-200 ease-premium',
        'flex items-center gap-3',
        'dark:bg-charcoal-800 dark:hover:bg-charcoal-700',
        className
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="heading-serif text-base text-bordeaux-600 dark:text-ivory-200">{name}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{winery}</p>
        {metadata && metadata.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500/80 dark:text-stone-400/80">
            {metadata.map((m) => (
              <span key={m.label}>
                {m.label}: {m.value}
              </span>
            ))}
          </div>
        )}
      </div>
      {trailing ?? <ChevronRight className="h-5 w-5 flex-shrink-0 text-bordeaux-300 dark:text-bordeaux-400" strokeWidth={1.5} />}
    </button>
  );
}
