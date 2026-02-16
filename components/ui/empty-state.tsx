import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <Card className="mt-8">
      <CardContent className="py-12 text-center">
        <Icon className="mx-auto h-16 w-16 text-ivory-400 dark:text-charcoal-700" strokeWidth={1.5} />
        <h3 className="mt-4 heading-serif text-lg text-stone-600 dark:text-stone-400">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-stone-600/80 dark:text-stone-400/80">{description}</p>
        )}
        {actionLabel && actionHref && (
          <Button className="mt-4" asChild>
            <a href={actionHref}>{actionLabel}</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
