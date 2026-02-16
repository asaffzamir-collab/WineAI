'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-ruby-500 text-white hover:bg-ruby-600 shadow-soft hover:shadow-soft-lg active:scale-[0.98]',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-soft',
        outline: 'border-2 border-bordeaux-500 text-bordeaux-500 hover:bg-bordeaux-50 dark:border-bordeaux-300 dark:text-bordeaux-200 dark:hover:bg-bordeaux-900',
        secondary: 'bg-ivory-300 text-bordeaux-600 hover:bg-ivory-400 dark:bg-charcoal-800 dark:text-ivory-200 dark:hover:bg-charcoal-700',
        ghost: 'hover:bg-ivory-300 hover:text-bordeaux-600 dark:hover:bg-charcoal-800 dark:hover:text-ivory-200',
        link: 'text-bordeaux-500 underline-offset-4 hover:underline dark:text-bordeaux-200',
      },
      size: {
        default: 'h-11 min-h-[44px] px-6 py-2',
        sm: 'h-9 rounded-lg px-4 text-xs',
        lg: 'h-12 min-h-[48px] rounded-xl px-8 text-base',
        icon: 'h-11 w-11 min-h-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
