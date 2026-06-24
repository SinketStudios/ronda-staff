import { notFound } from 'next/navigation';
import { getStaffAutomations } from '@/lib/api';
import { AutomationsPageClient } from './AutomationsPageClient';

export const metadata = {
  title: 'Automatizaciones - Ronda Staff',
};

export default async function AutomationsPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_STAFF_AUTOMATIONS !== 'true') {
    notFound();
  }

  const automations = await getStaffAutomations();

  return <AutomationsPageClient initialAutomations={automations} />;
}
