import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AdminPanel } from '@/components/admin-panel';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if ((session.user as any).role !== 'admin') redirect('/dashboard');

  return (
    <DashboardLayout>
      <AdminPanel />
    </DashboardLayout>
  );
}
