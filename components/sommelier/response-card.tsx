'use client';

import { cn } from '@/lib/utils';
import { ConfidenceBadge } from './confidence-badge';
import type { ConversationItem, ActionChip } from '@/lib/sommelier-types';

interface ResponseCardProps {
  item: ConversationItem;
  onAction?: (action: string, payload?: Record<string, unknown>) => void;
  className?: string;
  openedActionIcon?: React.ReactNode;
}

export function ResponseCard({ item, onAction, className, openedActionIcon }: ResponseCardProps) {
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
          {item.actions.map((chip: ActionChip) => {
            const isNoop = chip.action === '__noop';
            return (
              <button
                key={chip.action + chip.label}
                onClick={() => !isNoop && onAction?.(chip.action, chip.payload)}
                disabled={isNoop}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  isNoop
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 cursor-default flex items-center'
                    : 'border-border/60 bg-background text-foreground hover:bg-bordeaux-50 hover:text-bordeaux-700 dark:hover:bg-bordeaux-900/20 dark:hover:text-bordeaux-300',
                )}
              >
                {isNoop && openedActionIcon}
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
