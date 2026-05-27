import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/auth';
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const staff = await getCurrentStaff();

  if (staff) {
    redirect('/dashboard');
  }

  return <LoginClient />;
}
