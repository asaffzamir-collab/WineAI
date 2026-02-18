'use client';

import { Wine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';

export function SommelierTrigger() {
  const { toggle, isOpen } = useSommelier();

  return (
    <button
      onClick={toggle}
      aria-label="Open sommelier"
      className={cn(
        'fixed z-40 flex items-center justify-center rounded-full shadow-lift transition-all duration-200 ease-premium',
        'bg-garnet-500 text-white hover:scale-105 active:scale-95',
        'h-14 w-14 md:h-[60px] md:w-[60px]',
        // Always on the physical right so it never overlaps the sidebar (which is on physical left)
        'right-4 bottom-[76px]',
        'md:right-6 md:bottom-6',
        isOpen && 'scale-0 opacity-0 pointer-events-none'
      )}
    >
      <Wine className="h-6 w-6" strokeWidth={1.8} />
    </button>
  );
}
