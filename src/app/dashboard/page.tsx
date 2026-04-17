import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { BentoGrid } from '@/components/bento-grid';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <DashboardLayout>
      <BentoGrid session={session} />
    </DashboardLayout>
  );
}
