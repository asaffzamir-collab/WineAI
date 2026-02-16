'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-ivory-300 dark:bg-charcoal-700">
      <SliderPrimitive.Range className="absolute h-full bg-bordeaux-500 dark:bg-bordeaux-300" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-bordeaux-500 bg-white shadow-soft ring-offset-ivory-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-bordeaux-300 dark:bg-charcoal-800 dark:ring-offset-charcoal-900" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
