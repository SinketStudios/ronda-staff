import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/auth';
import { getAuditLogs } from '@/lib/api';
import { LogsPageClient } from './LogsPageClient';

export const dynamic = 'force-dynamic';

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    endpoint?: string;
    staffMemberId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const staff = await getCurrentStaff();

  if (!staff || staff.role !== 'superadmin') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const logs = await getAuditLogs({
    page: params.page ? Number(params.page) : 1,
    action: params.action,
    endpoint: params.endpoint,
    staffMemberId: params.staffMemberId,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  return (
    <div className="flex flex-col gap-5 h-full overflow-hidden">
      <header>
        <h1 className="text-3xl font-semibold text-ronda-text">Logs de Auditoría</h1>
        <p className="mt-2 text-sm text-ronda-muted">
          Registro completo de acciones del equipo interno. Solo superadmin.
        </p>
      </header>
      <LogsPageClient initialData={logs} />
    </div>
  );
}
