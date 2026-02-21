'use client';

import { DirectionProvider as RadixDirectionProvider } from '@radix-ui/react-direction';

export function DirectionProvider({ dir, children }: { dir: 'ltr' | 'rtl'; children: React.ReactNode }) {
  return <RadixDirectionProvider dir={dir}>{children}</RadixDirectionProvider>;
}
