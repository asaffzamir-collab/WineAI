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
import { cn } from '@/lib/utils';

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
  const isOnSettings = pathname === '/settings';
  const isOnGuide = pathname === '/guide';
  const isOnHome = pathname === '/';

  const defaultStyle = isOnHome
    ? 'text-white/80 hover:text-white hover:bg-white/10'
    : 'text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10';

  return (
    <div className="fixed top-0 end-0 z-30 flex items-center gap-0.5 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
      <Link
        href="/guide"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          isOnGuide
            ? 'bg-bordeaux-100 text-bordeaux-600 dark:bg-bordeaux-900/30 dark:text-bordeaux-300'
            : defaultStyle,
        )}
        aria-label={t('guide')}
      >
        <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </Link>
      <Link
        href="/settings"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
          isOnSettings
            ? 'bg-bordeaux-100 text-bordeaux-600 dark:bg-bordeaux-900/30 dark:text-bordeaux-300'
            : defaultStyle,
        )}
        aria-label={t('settings')}
      >
        <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <SommelierProvider>
      <div className="min-h-screen">
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
        <SommelierPanel />
        <Suspense fallback={null}>
          <SommelierAutoOpen />
        </Suspense>
      </div>
    </SommelierProvider>
  );
}
