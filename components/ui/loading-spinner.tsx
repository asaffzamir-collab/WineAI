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
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className={cn('animate-spin text-bordeaux-500 dark:text-bordeaux-300', sizeClasses[size])} />
      {message && <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">{message}</p>}
    </div>
  );
}
