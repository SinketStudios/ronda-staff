'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RestaurantBillingSubscription, StaffClient } from '@/lib/api';

const statusLabel: Record<StaffClient['paymentStatus'], string> = {
  not_configured: 'Sin configurar',
  pending: 'Pendiente',
  active: 'Activo',
  restricted: 'Restringido',
};

const statusClass: Record<StaffClient['paymentStatus'], string> = {
  not_configured: 'bg-ronda-bg text-ronda-muted',
  pending: 'bg-ronda-gold/10 text-ronda-gold-dark',
  active: 'bg-ronda-success/10 text-ronda-success',
  restricted: 'bg-red-50 text-ronda-error',
};

const subscriptionStatus: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-ronda-success/10 text-ronda-success' },
  trialing: { label: 'Prueba', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  incomplete: { label: 'Pendiente de pago', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  incomplete_expired: { label: 'Pago expirado', className: 'bg-red-50 text-ronda-error' },
  past_due: { label: 'Pago fallido', className: 'bg-red-50 text-ronda-error' },
  unpaid: { label: 'Impagado', className: 'bg-red-50 text-ronda-error' },
  canceled: { label: 'Cancelado', className: 'bg-ronda-bg text-ronda-muted' },
  paused: { label: 'Pausado', className: 'bg-ronda-bg text-ronda-muted' },
  pending_payment: { label: 'Pago pendiente', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  restricted: { label: 'Restringido', className: 'bg-red-50 text-ronda-error' },
  cancelled: { label: 'Cancelado', className: 'bg-ronda-bg text-ronda-muted' },
};

const operationalSubscriptionStatuses = new Set(['active', 'trialing']);
const planNames: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

function formatSubscriptionStatus(status: string | null) {
  return status
    ? subscriptionStatus[status] ?? { label: status, className: 'bg-ronda-bg text-ronda-muted' }
    : { label: 'Sin suscripcion', className: 'bg-ronda-bg text-ronda-muted' };
}

function formatPlan(client: StaffClient) {
  const subscription = client.subscription;
  const suffix = subscription.billingCycle === 'annual' ? 'anual' : subscription.billingCycle === 'monthly' ? 'mensual' : 'sin ciclo';
  const price = subscription.amountCents
    ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: (subscription.currency || 'eur').toUpperCase() }).format(subscription.amountCents / 100)
    : '-';

  return {
    name: subscription.planName || 'Sin plan',
    price,
    cycle: suffix,
    source: 'Locales',
  };
}

function formatRestaurantSubscription(subscription: RestaurantBillingSubscription | null) {
  const statusData = formatSubscriptionStatus(subscription?.status ?? null);
  const planName = subscription?.planId ? planNames[subscription.planId] ?? subscription.planId : 'Sin plan';
  const cycle = subscription?.billingCycle === 'annual' ? 'anual' : subscription?.billingCycle === 'monthly' ? 'mensual' : 'sin ciclo';
  return { planName, cycle, statusData };
}

function getBillingIssueCount(client: StaffClient) {
  return (client.restaurants ?? []).filter((restaurant) => !operationalSubscriptionStatuses.has(restaurant.subscription?.status ?? '')).length;
}

interface ClientsTableProps {
  clients: StaffClient[];
  onSelectClient: (client: StaffClient) => void;
}

export function ClientsTable({ clients, onSelectClient }: ClientsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [planStatus, setPlanStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesQuery = !normalizedQuery || [
        client.name,
        client.legalName,
        client.taxId,
        client.email,
        client.owner.name,
        client.owner.email,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));

      const matchesPlanStatus = planStatus === 'all' || client.subscription.status === planStatus;
      const matchesPaymentStatus = paymentStatus === 'all' || client.paymentStatus === paymentStatus;

      return matchesQuery && matchesPlanStatus && matchesPaymentStatus;
    });
  }, [clients, paymentStatus, planStatus, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-hidden">
      {/* Filters Block - No background, white inputs */}
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase text-ronda-muted lg:min-w-72 lg:flex-1">
          Buscar
          <input
            value={query}
            onChange={(event) => updateFilter(() => setQuery(event.target.value))}
            placeholder="Organizacion, propietario, email..."
            className="min-h-10 rounded-lg bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none border border-ronda-border placeholder:text-ronda-muted/60 transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
          Estado plan
          <select
            value={planStatus}
            onChange={(event) => updateFilter(() => setPlanStatus(event.target.value))}
            className="min-h-10 rounded-lg bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none border border-ronda-border transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
          >
            <option value="all">Todos</option>
            <option value="active">Activo</option>
            <option value="trialing">Prueba</option>
            <option value="incomplete">Pendiente pago</option>
            <option value="past_due">Pago fallido</option>
            <option value="unpaid">Impagado</option>
            <option value="canceled">Cancelado</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
          Cobros
          <select
            value={paymentStatus}
            onChange={(event) => updateFilter(() => setPaymentStatus(event.target.value))}
            className="min-h-10 rounded-lg bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none border border-ronda-border transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
          >
            <option value="all">Todos</option>
            <option value="not_configured">Sin configurar</option>
            <option value="pending">Pendiente</option>
            <option value="active">Activo</option>
            <option value="restricted">Restringido</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
          Mostrar
          <select
            value={pageSize}
            onChange={(event) => updateFilter(() => setPageSize(Number(event.target.value)))}
            className="min-h-10 rounded-lg bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none border border-ronda-border transition focus:ring-2 focus:ring-ronda-gold focus:border-ronda-gold"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark sm:col-span-2 lg:col-span-1"
        >
          Actualizar
        </button>
      </div>

      {/* Table Block - Border, white background, rounded, internal scroll */}
      <section className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface lg:flex">
        <div className="grid shrink-0 grid-cols-[1.25fr_1fr_0.95fr_0.75fr_1fr_6rem] gap-4 border-b border-ronda-border bg-ronda-surface-soft px-4 py-3 text-xs font-semibold uppercase text-ronda-muted">
          <span>Organizacion</span>
          <span>Suscripcion</span>
          <span>Estado plan</span>
          <span>Cobros</span>
          <span>Propietario</span>
          <span className="text-right">Locales</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {pageItems.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ronda-muted">No hay clientes que coincidan con los filtros.</div>
          ) : (
            <div className="divide-y divide-ronda-border">
              {pageItems.map((client) => {
                const plan = formatPlan(client);
                const planStatusData = formatSubscriptionStatus(client.subscription.status);
                const billingIssueCount = getBillingIssueCount(client);

                return (
                  <button
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="grid grid-cols-[1.25fr_1fr_0.95fr_0.75fr_1fr_6rem] items-center gap-4 px-4 py-4 text-sm transition hover:bg-ronda-bg/60 bg-ronda-surface text-left w-full border-none cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ronda-text">{client.name}</p>
                      <p className="truncate text-xs text-ronda-muted">{client.legalName || client.taxId || client.email || 'Sin datos fiscales'}</p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ronda-text">{plan.name}</p>
                      <p className="truncate text-xs text-ronda-muted">{plan.price} - {plan.cycle} - {plan.source}</p>
                    </div>

                    <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${planStatusData.className}`}>
                      {planStatusData.label}
                    </span>

                    <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass[client.paymentStatus]}`}>
                      {statusLabel[client.paymentStatus]}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-ronda-text">{client.owner.name}</p>
                      <p className="truncate text-xs text-ronda-muted">{client.owner.email}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-ronda-coffee">{client.restaurantsCount}</p>
                      {billingIssueCount > 0 ? (
                        <p className="text-xs font-semibold text-ronda-error">{billingIssueCount} billing</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 lg:hidden">
        {pageItems.length === 0 ? (
          <div className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-10 text-center text-sm text-ronda-muted">
            No hay clientes que coincidan con los filtros.
          </div>
        ) : (
          pageItems.map((client) => {
            const plan = formatPlan(client);
            const planStatusData = formatSubscriptionStatus(client.subscription.status);
            const billingIssueCount = getBillingIssueCount(client);
            const primaryLocalBilling = formatRestaurantSubscription(client.primaryRestaurant?.subscription ?? null);

            return (
              <button
                key={client.id}
                type="button"
                onClick={() => onSelectClient(client)}
                className="rounded-lg border border-ronda-border bg-ronda-surface p-4 text-left shadow-sm transition hover:bg-ronda-bg/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ronda-text">{client.name}</p>
                    <p className="mt-1 truncate text-xs text-ronda-muted">{client.legalName || client.taxId || client.email || 'Sin datos fiscales'}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-ronda-coffee">{client.restaurantsCount} locales</span>
                </div>
                <div className="mt-3 grid gap-2">
                  <p className="truncate text-sm font-semibold text-ronda-text">{plan.name}</p>
                  <p className="truncate text-xs text-ronda-muted">{plan.price} - {plan.cycle} - {plan.source}</p>
                  {client.primaryRestaurant ? (
                    <p className="truncate text-xs text-ronda-muted">
                      Local principal: {primaryLocalBilling.planName} - {primaryLocalBilling.cycle}
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${planStatusData.className}`}>
                    {planStatusData.label}
                  </span>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass[client.paymentStatus]}`}>
                    {statusLabel[client.paymentStatus]}
                  </span>
                  {billingIssueCount > 0 ? (
                    <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-ronda-error">
                      {billingIssueCount} locales con billing
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 truncate text-xs text-ronda-muted">{client.owner.name} · {client.owner.email}</p>
              </button>
            );
          })
        )}
      </section>

      {/* Pagination Block - No background, white input buttons */}
      <div className="grid shrink-0 gap-3 text-sm text-ronda-muted sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p>
          {filtered.length === 0 ? '0 clientes' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length}`}
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="min-h-9 rounded-lg bg-ronda-surface border border-ronda-border px-3 font-semibold text-ronda-coffee transition hover:bg-ronda-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="min-w-20 text-center font-semibold text-ronda-text">{currentPage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage === totalPages}
            className="min-h-9 rounded-lg bg-ronda-surface border border-ronda-border px-3 font-semibold text-ronda-coffee transition hover:bg-ronda-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
