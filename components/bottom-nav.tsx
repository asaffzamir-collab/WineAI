'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Search, Wine, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, labelKey: 'home' },
  { href: '/search', icon: Search, labelKey: 'search' },
  { href: '/cellar', icon: Wine, labelKey: 'cellar' },
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

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 shadow-[0_-2px_16px_rgb(0,0,0,0.04)] md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
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
                'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-2.5 py-2.5 transition-all duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
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
                <span className="absolute -bottom-0.5 h-0.5 w-6 rounded-full bg-primary transition-all duration-150" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
