import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="mt-8 border-dashed">
      <CardContent className="py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-2">
          <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h3 className="mt-4 text-heading text-foreground">{title}</h3>
        {description && (
          <p className="mt-1.5 mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {actionLabel && actionHref && (
          <Button className="mt-6" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
        {actionLabel && onAction && !actionHref && (
          <Button className="mt-6" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
