import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({
  message,
  className,
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12', className)}
      role="status"
      aria-label={message || 'Loading'}
    >
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} aria-hidden="true" />
      {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
      {!message && <span className="sr-only">Loading</span>}
    </div>
  );
}
