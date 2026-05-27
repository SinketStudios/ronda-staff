import { getStaffClients } from '@/lib/api';
import { ClientsPageWrapper } from './ClientsPageWrapper';

export default async function ClientsPage() {
  const clients = await getStaffClients();

  return <ClientsPageWrapper clients={clients} />;
}
