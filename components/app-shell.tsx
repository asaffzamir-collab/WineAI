'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { SommelierProvider, useSommelier } from '@/components/sommelier/sommelier-context';
import { SommelierTrigger } from '@/components/sommelier/sommelier-trigger';
import { SommelierPanel } from '@/components/sommelier/sommelier-panel';

interface AppShellProps {
  children: React.ReactNode;
}

function SommelierAutoOpen() {
  const params = useSearchParams();
  const { open } = useSommelier();

  useEffect(() => {
    if (params.get('sommelier') === 'open') {
      const flow = params.get('flow') || undefined;
      open(flow);
    }
  }, [params, open]);

  return null;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SommelierProvider>
      <div className="min-h-screen">
        <Sidebar />

        <div className="md:pl-16 lg:pl-64">
          <main className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
        </div>

        <BottomNav />
        <SommelierTrigger />
        <SommelierPanel />
        <Suspense fallback={null}>
          <SommelierAutoOpen />
        </Suspense>
      </div>
    </SommelierProvider>
  );
}
