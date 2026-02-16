import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { AdminPage } from '@/components/pages/admin-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const admin = await requireAdmin();

  if (!admin) {
    redirect('/');
  }

  return <AdminPage adminEmail={admin.email || ''} />;
}
