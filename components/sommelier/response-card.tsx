'use client';

import { cn } from '@/lib/utils';
import { ConfidenceBadge } from './confidence-badge';
import type { ConversationItem, ActionChip } from '@/lib/sommelier-types';

interface ResponseCardProps {
  item: ConversationItem;
  onAction?: (action: string, payload?: Record<string, unknown>) => void;
  className?: string;
}

export function ResponseCard({ item, onAction, className }: ResponseCardProps) {
  return (
    <div className={cn('rounded-xl border border-border/60 bg-card p-4 shadow-soft animate-fade-in', className)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-foreground leading-tight">{item.title}</h4>
        {item.confidence && <ConfidenceBadge level={item.confidence} />}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.content}</p>

      {item.reasons && item.reasons.length > 0 && (
        <ul className="mb-3 space-y-1">
          {item.reasons.slice(0, 3).map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-bordeaux-400 flex-shrink-0" />
              {reason}
            </li>
          ))}
        </ul>
      )}

      {item.actions && item.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {item.actions.map((chip: ActionChip) => (
            <button
              key={chip.action}
              onClick={() => onAction?.(chip.action, chip.payload)}
              className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
