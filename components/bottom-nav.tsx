'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Home, Search, Wine, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Wishlist removed from nav for now; code kept in app/wishlist, components/pages/wishlist-page, api/wishlist for future use
const navItems = [
  { href: '/', icon: Home, labelKey: 'home' },
  { href: '/search', icon: Search, labelKey: 'search' },
  { href: '/cellar', icon: Wine, labelKey: 'cellar' },
  { href: '/profile', icon: User, labelKey: 'profile' },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-cream-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 transition-colors',
                isActive
                  ? 'text-wine-900'
                  : 'text-gray-400 hover:text-wine-700'
              )}
            >
              <Icon
                className={cn(
                  'h-6 w-6 transition-all',
                  isActive && 'scale-110'
                )}
              />
              <span className="text-xs font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
