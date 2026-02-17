import { cn } from '@/lib/utils';

interface DataListRowProps {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  metadata?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DataListRow({
  leading,
  title,
  subtitle,
  metadata,
  trailing,
  onClick,
  className,
}: DataListRowProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-raised active:bg-surface-2',
        className
      )}
    >
      {leading && (
        <div className="flex-shrink-0">{leading}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
        {metadata && (
          <p className="mt-0.5 text-caption text-muted-foreground">{metadata}</p>
        )}
      </div>
      {trailing && (
        <div className="flex-shrink-0">{trailing}</div>
      )}
    </Component>
  );
}
