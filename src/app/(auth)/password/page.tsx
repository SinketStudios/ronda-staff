import { redirect } from 'next/navigation';
import { getPasswordResetInfo } from '@/lib/api';
import { PasswordClient } from './PasswordClient';

export const metadata = {
  title: 'Restablecer contraseña — Ronda',
};

interface PasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function PasswordPage({ searchParams }: PasswordPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect('/login');
  }

  let info: { name: string; employeeCode: string };
  try {
    info = await getPasswordResetInfo(token);
  } catch {
    redirect('/login');
  }

  return <PasswordClient token={token} name={info.name} employeeCode={info.employeeCode} />;
}
