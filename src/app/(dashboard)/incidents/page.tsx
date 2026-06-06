import { getSupportTickets } from '@/lib/api';
import { IncidentsPageClient } from './IncidentsPageClient';

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  let tickets: Awaited<ReturnType<typeof getSupportTickets>> = [];
  try {
    tickets = await getSupportTickets();
  } catch {
    // Client component handles empty + refresh
  }
  return <IncidentsPageClient initialTickets={tickets} />;
}
