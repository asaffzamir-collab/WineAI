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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-cream-200 bg-white/95 shadow-[0_-2px_10px_rgb(0,0,0,0.04)] backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 px-2.5 py-2 transition-colors',
                isActive
                  ? 'text-wine-900'
                  : 'text-gray-400 hover:text-wine-700'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive && 'scale-110'
                )}
              />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
              {isActive && (
                <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-wine-900 transition-all duration-200" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
