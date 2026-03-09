'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Shield, ArrowLeft, LayoutDashboard, Users, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TABS = [
  { href: '/admin', icon: LayoutDashboard, labelKey: 'tabDashboard' as const },
  { href: '/admin/users', icon: Users, labelKey: 'tabUsers' as const },
  { href: '/admin/records', icon: Database, labelKey: 'tabRecords' as const },
] as const;

export function AdminLayoutShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('admin');
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-ivory-200 dark:bg-charcoal-900">
      <header className="bg-charcoal-800 px-4 pb-3 pt-8 dark:bg-charcoal-900 dark:border-b dark:border-charcoal-700">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal-700">
                <Shield className="h-5 w-5 text-copper-400" />
              </div>
              <div>
                <h1 className="heading-serif text-xl text-white">{t('title')}</h1>
                <p className="text-xs text-charcoal-400">{adminEmail}</p>
              </div>
            </div>
            <Link href="/settings">
              <Button
                variant="outline"
                size="sm"
                className="border-charcoal-600 bg-charcoal-700 text-charcoal-200 hover:bg-charcoal-600 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 me-1.5" />
                {t('backToSettings')}
              </Button>
            </Link>
          </div>

          <nav className="mt-4 flex gap-1">
            {TABS.map(({ href, icon: Icon, labelKey }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-charcoal-600 text-white'
                    : 'text-charcoal-400 hover:bg-charcoal-700 hover:text-charcoal-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 mt-6 pb-8">
        {children}
      </main>
    </div>
  );
}
