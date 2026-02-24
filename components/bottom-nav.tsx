'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Wine, Heart, User, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const leftItems = [
  { href: '/', icon: Home, labelKey: 'home' },
  { href: '/cellar', icon: Wine, labelKey: 'cellar' },
];

const rightItems = [
  { href: '/wishlist', icon: Heart, labelKey: 'wishlist' },
  { href: '/profile', icon: User, labelKey: 'profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const prefetchedRef = useRef(false);

  const prefetchCellar3D = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    import('@/components/cellar/rack/rack-3d-canvas').catch(() => {});
  }, []);

  const isSearchActive = pathname === '/search';

  const renderNavItem = (item: (typeof leftItems)[number]) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    const isCellar = item.href === '/cellar';

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={t(item.labelKey)}
        aria-current={isActive ? 'page' : undefined}
        onMouseEnter={isCellar ? prefetchCellar3D : undefined}
        onTouchStart={isCellar ? prefetchCellar3D : undefined}
        className={cn(
          'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-4 py-2.5 transition-all duration-150',
          isActive
            ? 'text-white'
            : 'text-white/60 hover:text-white'
        )}
      >
        <Icon
          className={cn(
            'h-5 w-5 transition-all duration-150',
            isActive && 'scale-110'
          )}
          strokeWidth={isActive ? 2 : 1.5}
        />
        <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
        {isActive && (
          <span className="absolute -bottom-0.5 h-0.5 w-6 rounded-full bg-white transition-all duration-150" />
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-bordeaux-600 dark:bg-charcoal-800 shadow-[0_-4px_20px_rgb(0,0,0,0.15)] md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {leftItems.map(renderNavItem)}

        {/* Raised center search/camera button */}
        <Link
          href="/search"
          aria-label={t('search')}
          aria-current={isSearchActive ? 'page' : undefined}
          className="relative -mt-8 flex flex-col items-center"
        >
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all duration-200',
              'bg-white dark:bg-charcoal-700 ring-[4px]',
              isSearchActive
                ? 'ring-bordeaux-700 dark:ring-bordeaux-500 scale-105'
                : 'ring-bordeaux-600 dark:ring-charcoal-600 hover:scale-105'
            )}
          >
            <Camera className="h-7 w-7 text-bordeaux-600 dark:text-bordeaux-300" strokeWidth={1.8} />
          </div>
          <span className={cn(
            'mt-1 text-[10px] font-medium',
            isSearchActive ? 'text-white' : 'text-white/60'
          )}>
            {t('search')}
          </span>
        </Link>

        {rightItems.map(renderNavItem)}
      </div>
    </nav>
  );
}
