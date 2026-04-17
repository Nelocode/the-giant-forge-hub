import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CalendarView } from '@/components/calendar-view';

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <DashboardLayout>
      <CalendarView session={session} />
    </DashboardLayout>
  );
}
