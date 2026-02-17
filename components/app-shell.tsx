'use client';

import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="md:pl-16 lg:pl-64">
        <main className="min-h-screen pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
