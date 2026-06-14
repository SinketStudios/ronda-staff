'use client';

import type { StaffClient } from '@/lib/api';
import { ClientsTable } from './ClientsTable';

interface ClientsPageClientProps {
  clients: StaffClient[];
  onSelectClient: (client: StaffClient) => void;
}

export function ClientsPageClient({ clients, onSelectClient }: ClientsPageClientProps) {
  const totalRestaurants = clients.reduce((total, client) => total + client.restaurantsCount, 0);
  const reviewRestaurants = clients.reduce(
    (total, client) =>
      total +
      (client.restaurants ?? []).filter((restaurant) => {
        const status = restaurant.subscription?.status ?? '';
        return !['active', 'trialing'].includes(status);
      }).length,
    0,
  );

  return (
    <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
      <header className="grid shrink-0 gap-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ronda-text sm:text-3xl">Clientes</h1>
          <p className="mt-2 text-sm text-ronda-muted">Organizaciones y suscripciones gestionadas por local.</p>
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface sm:min-w-[360px]">
          <div className="px-4 py-3 sm:text-right">
            <p className="text-2xl font-semibold text-ronda-coffee">{clients.length}</p>
            <p className="text-xs font-semibold uppercase text-ronda-muted">Clientes</p>
          </div>
          <div className="border-l border-ronda-border px-4 py-3 sm:text-right">
            <p className="text-2xl font-semibold text-ronda-coffee">{totalRestaurants}</p>
            <p className="text-xs font-semibold uppercase text-ronda-muted">Locales</p>
          </div>
          <div className="border-l border-ronda-border px-4 py-3 sm:text-right">
            <p className="text-2xl font-semibold text-ronda-error">{reviewRestaurants}</p>
            <p className="text-xs font-semibold uppercase text-ronda-muted">Revisión</p>
          </div>
        </div>
      </header>

      <ClientsTable clients={clients} onSelectClient={onSelectClient} />
    </div>
  );
}
