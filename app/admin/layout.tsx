import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  if (!admin) {
    redirect('/');
  }

  return (
    <AdminLayoutShell adminEmail={admin.email || ''}>
      {children}
    </AdminLayoutShell>
  );
}
