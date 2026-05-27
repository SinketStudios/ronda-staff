import { redirect } from 'next/navigation';
import { SetupClient } from './SetupClient';

export const metadata = {
  title: 'Configurar cuenta — Ronda',
};

interface SetupPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    redirect('/login');
  }

  return <SetupClient token={token} />;
}
