'use client';

import type { StaffClient } from '@/lib/api';
import { ClientsTable } from './ClientsTable';

interface ClientsPageClientProps {
  clients: StaffClient[];
  onSelectClient: (client: StaffClient) => void;
}

export function ClientsPageClient({ clients, onSelectClient }: ClientsPageClientProps) {
  return (
    <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
      <header className="grid shrink-0 gap-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ronda-text sm:text-3xl">Clientes</h1>
          <p className="mt-2 text-sm text-ronda-muted">Organizaciones y locales reales registrados en Ronda.</p>
        </div>
        <div className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-3 sm:text-right">
          <p className="text-2xl font-semibold text-ronda-coffee">{clients.length}</p>
          <p className="text-xs font-semibold uppercase text-ronda-muted">Clientes</p>
        </div>
      </header>

      <ClientsTable clients={clients} onSelectClient={onSelectClient} />
    </div>
  );
}
