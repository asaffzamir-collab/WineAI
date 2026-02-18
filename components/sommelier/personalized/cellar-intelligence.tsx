'use client';

import { cn } from '@/lib/utils';
import { Wine, Calendar, Palette, Sparkles } from 'lucide-react';

interface CellarSuggestion {
  type: 'peak_window' | 'diversity' | 'gap';
  title: string;
  description: string;
}

interface Props {
  suggestions: CellarSuggestion[];
  className?: string;
}

export function CellarIntelligence({ suggestions, className }: Props) {
  if (!suggestions.length) return null;

  const ICONS = {
    peak_window: Calendar,
    diversity: Palette,
    gap: Wine,
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-bordeaux-500" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sommelier Insights</span>
      </div>
      {suggestions.map((s, i) => {
        const Icon = ICONS[s.type] || Wine;
        return (
          <div key={i} className="flex items-start gap-2.5 rounded-lg bg-bordeaux-50/50 dark:bg-bordeaux-900/10 p-3 border border-bordeaux-100/30 dark:border-bordeaux-800/20">
            <Icon className="h-4 w-4 text-bordeaux-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{s.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
