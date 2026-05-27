'use client';

import { useState } from 'react';
import type { StaffClient } from '@/lib/api';
import { ClientsTable } from './ClientsTable';
import { ClientDetailSidebar } from './ClientDetailSidebar';

interface ClientsPageClientProps {
  clients: StaffClient[];
  onSelectClient: (client: StaffClient) => void;
}

export function ClientsPageClient({ clients, onSelectClient }: ClientsPageClientProps) {
  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ronda-text">Clientes</h1>
          <p className="mt-2 text-sm text-ronda-muted">Organizaciones y locales reales registrados en Ronda.</p>
        </div>
        <div className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-3 text-right">
          <p className="text-2xl font-semibold text-ronda-coffee">{clients.length}</p>
          <p className="text-xs font-semibold uppercase text-ronda-muted">Clientes</p>
        </div>
      </header>

      <ClientsTable clients={clients} onSelectClient={onSelectClient} />
    </div>
  );
}
