'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Search, Wine, Heart, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WineLogo } from '@/components/wine-logo';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { href: '/', icon: Home, labelKey: 'home' },
  { href: '/search', icon: Search, labelKey: 'search' },
  { href: '/cellar', icon: Wine, labelKey: 'cellar' },
  { href: '/wishlist', icon: Heart, labelKey: 'wishlist' },
  { href: '/profile', icon: User, labelKey: 'profile' },
];

const bottomNavItems = [
  { href: '/settings', icon: Settings, labelKey: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-16 lg:w-64 md:border-r md:border-sidebar-border md:bg-sidebar">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <WineLogo size={32} />
        <span className="hidden lg:block text-heading text-sidebar-foreground">
          WineJourney
        </span>
      </div>

      <Separator />

      {/* Main nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-4 lg:px-3">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    'min-h-[44px]',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span className="hidden lg:block">{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 lg:px-3">
        <Separator className="mb-4" />
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                    'min-h-[44px]',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span className="hidden lg:block">{t(item.labelKey)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
