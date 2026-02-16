'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Search, Wine, Heart, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, labelKey: 'home' },
  { href: '/search', icon: Search, labelKey: 'search' },
  { href: '/cellar', icon: Wine, labelKey: 'cellar' },
  { href: '/wishlist', icon: Heart, labelKey: 'wishlist' },
  { href: '/profile', icon: User, labelKey: 'profile' },
  { href: '/settings', icon: Settings, labelKey: 'settings' },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-ivory-300/50 shadow-[0_-2px_16px_rgb(0,0,0,0.04)] dark:border-charcoal-700/50">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-2.5 py-2.5 transition-all duration-200 ease-premium',
                isActive
                  ? 'text-ruby-500 dark:text-ruby-400'
                  : 'text-stone-500 hover:text-bordeaux-500 dark:text-stone-400 dark:hover:text-bordeaux-300'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 h-0.5 w-6 rounded-full bg-ruby-500 transition-all duration-200 dark:bg-ruby-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
