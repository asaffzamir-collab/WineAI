'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BookOpen, Settings } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallBanner } from '@/components/pwa-install-banner';
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

function MobileTopActions() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  if (pathname !== '/') return null;

  return (
    <div className="absolute top-0 end-0 z-30 flex items-center gap-0.5 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
      <Link
        href="/guide"
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors text-white/80 hover:text-white hover:bg-white/10"
        aria-label={t('guide')}
      >
        <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </Link>
      <Link
        href="/settings"
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors text-white/80 hover:text-white hover:bg-white/10"
        aria-label={t('settings')}
      >
        <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

function AppShellContent({ children }: AppShellProps) {
  const { isOpen } = useSommelier();

  return (
    <div className="min-h-screen">
      {/* Hide everything on mobile when Pier is open */}
      <div className={isOpen ? 'hidden md:contents' : undefined}>
        <Sidebar />
        <div className="md:pl-16 lg:pl-64">
          <main className="min-h-screen pb-32 md:pb-0">
            {children}
          </main>
        </div>
        <MobileTopActions />
        <PwaInstallBanner />
        <BottomNav />
        <SommelierTrigger />
      </div>
      <SommelierPanel />
      <Suspense fallback={null}>
        <SommelierAutoOpen />
      </Suspense>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SommelierProvider>
      <AppShellContent>{children}</AppShellContent>
    </SommelierProvider>
  );
}
