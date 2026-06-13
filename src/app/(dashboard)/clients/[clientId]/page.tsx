import { getStaffClient } from '@/lib/api';
import { ClientDetailPage } from './ClientDetailPage';
import { notFound } from 'next/navigation';

interface ClientPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const { clientId } = await params;

  let client;
  try {
    client = await getStaffClient(clientId);
  } catch {
    notFound();
  }

  return <ClientDetailPage client={client} />;
}
