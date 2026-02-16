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
        'w-full rounded-lg border border-wine-100 bg-white p-3 text-left shadow-sm',
        'hover:border-wine-300 hover:bg-wine-50/50 transition-colors',
        'flex items-center gap-3',
        className
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-wine-900">{name}</p>
        <p className="text-sm text-gray-600">{winery}</p>
        {metadata && metadata.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {metadata.map((m) => (
              <span key={m.label}>
                {m.label}: {m.value}
              </span>
            ))}
          </div>
        )}
      </div>
      {trailing ?? <ChevronRight className="h-5 w-5 flex-shrink-0 text-wine-400" />}
    </button>
  );
}
