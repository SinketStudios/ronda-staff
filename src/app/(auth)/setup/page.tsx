import { redirect } from 'next/navigation';
import { getSetupInfo } from '@/lib/api';
import { SetupClient } from './SetupClient';

export const metadata = {
  title: 'Configurar cuenta — Ronda',
};

interface SetupPageProps {
  searchParams: Promise<{ token?: string; step?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const token = params.token;
  const step = Math.max(1, parseInt(params.step ?? '1', 10) || 1);

  if (!token) {
    redirect('/login');
  }

  let employeeInfo: { name: string; employeeCode: string };
  try {
    employeeInfo = await getSetupInfo(token);
  } catch {
    redirect('/login');
  }

  return (
    <SetupClient
      token={token}
      step={step}
      name={employeeInfo.name}
      employeeCode={employeeInfo.employeeCode}
    />
  );
}
