import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/auth';

export default async function RootPage() {
  const staff = await getCurrentStaff();

  if (staff) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
