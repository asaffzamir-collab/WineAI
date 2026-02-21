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
        'w-full rounded-xl bg-card p-3.5 text-start shadow-soft',
        'card-hover',
        'flex items-center gap-3',
        className
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-heading text-base text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">{winery}</p>
        {metadata && metadata.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground/80">
            {metadata.map((m) => (
              <span key={m.label}>
                {m.label}: {m.value}
              </span>
            ))}
          </div>
        )}
      </div>
      {trailing ?? <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" strokeWidth={1.5} />}
    </button>
  );
}
