import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 min-h-[44px] w-full rounded-xl border border-ivory-400 bg-white px-4 py-2 text-base transition-all duration-200 ease-premium',
          'ring-offset-ivory-200 file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-stone-500/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby-500/40 focus-visible:ring-offset-2 focus-visible:border-ruby-500/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-ivory-200 dark:ring-offset-charcoal-900 dark:placeholder:text-stone-500',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
