'use client';

import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface Props {
  insight: string;
  className?: string;
}

export function AdaptiveInsight({ insight, className }: Props) {
  if (!insight) return null;

  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg bg-bordeaux-50/50 dark:bg-bordeaux-900/10 p-3 border border-bordeaux-100/50 dark:border-bordeaux-800/20', className)}>
      <Sparkles className="h-4 w-4 text-bordeaux-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
    </div>
  );
}
