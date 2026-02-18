'use client';

import { cn } from '@/lib/utils';
import type { ConversationItem } from '@/lib/sommelier-types';
import { Sparkles, X } from 'lucide-react';

interface InsightCardProps {
  item: ConversationItem;
  onDismiss?: () => void;
  className?: string;
}

export function InsightCard({ item, onDismiss, className }: InsightCardProps) {
  return (
    <div className={cn('relative rounded-xl border border-bordeaux-200/40 bg-bordeaux-50/50 dark:bg-bordeaux-900/10 dark:border-bordeaux-800/30 p-4 animate-fade-in', className)}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 end-2 rounded-full p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30">
          <Sparkles className="h-4 w-4 text-bordeaux-600 dark:text-bordeaux-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground mb-1">{item.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.content}</p>
        </div>
      </div>
    </div>
  );
}
