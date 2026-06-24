import { notFound } from 'next/navigation';
import { getStaffAutomation } from '@/lib/api';
import { AutomationWorkflowEditor } from './AutomationWorkflowEditor';

export const metadata = {
  title: 'Workflow - Ronda Staff',
};

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  if (process.env.NEXT_PUBLIC_ENABLE_STAFF_AUTOMATIONS !== 'true') {
    notFound();
  }

  const { automationId } = await params;
  let automation;

  try {
    automation = await getStaffAutomation(automationId);
  } catch {
    notFound();
  }

  return <AutomationWorkflowEditor automation={automation} />;
}
