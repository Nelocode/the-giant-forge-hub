import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProfileForm } from '@/components/profile-form';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <DashboardLayout>
      <ProfileForm session={session} />
    </DashboardLayout>
  );
}
