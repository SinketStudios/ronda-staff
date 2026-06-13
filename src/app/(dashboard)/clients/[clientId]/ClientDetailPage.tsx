'use client';

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
  const renewal = subscription?.cancelAtPeriodEnd ? 'Cancela al renovar' : 'Renueva';
  return { planName, cycle, renewal, statusData };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface ClientDetailPageProps {
  client: StaffClient;
}

export function ClientDetailPage({ client }: ClientDetailPageProps) {
  const router = useRouter();
  const plan = formatPlan(client);
  const planStatusData = formatSubscriptionStatus(client.subscription.status);

  return (
    <div className="flex flex-col gap-5 overflow-hidden h-full">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-ronda-border text-ronda-muted hover:bg-ronda-bg transition"
              title="Volver"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-ronda-text">{client.name}</h1>
              <p className="mt-1 text-sm text-ronda-muted">{client.legalName || 'Sin nombre legal'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content Grid */}
      <div className="flex-1 min-h-0 overflow-auto rounded-lg bg-ronda-surface p-6 outline outline-1 -outline-offset-1 outline-ronda-border">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl">
          {/* Información General */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-ronda-text mb-4">Información General</h2>
              <div className="space-y-4">
                {client.taxId && (
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">NIF/CIF</p>
                    <p className="text-sm font-medium text-ronda-text">{client.taxId}</p>
                  </div>
                )}
                {client.email && (
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">Email</p>
                    <p className="text-sm text-ronda-text break-all">{client.email}</p>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">Teléfono</p>
                    <p className="text-sm text-ronda-text">{client.phone}</p>
                  </div>
                )}
                {client.country && (
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">País</p>
                    <p className="text-sm text-ronda-text">{client.country}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-ronda-border">
                  <p className="text-xs text-ronda-muted uppercase mb-1">Creado el</p>
                  <p className="text-sm text-ronda-text">{formatDate(client.createdAt)}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Propietario */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-ronda-text mb-4">Propietario</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-ronda-muted uppercase mb-1">Nombre</p>
                  <p className="text-sm font-medium text-ronda-text">{client.owner.name}</p>
                </div>
                <div>
                  <p className="text-xs text-ronda-muted uppercase mb-1">Email</p>
                  <p className="text-sm text-ronda-text break-all">{client.owner.email}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Suscripción y Pagos */}
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-ronda-text mb-4">Suscripción</h2>
              <div className="space-y-3 bg-ronda-bg rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">Plan</p>
                    <p className="text-sm font-medium text-ronda-text">{plan.name}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${planStatusData.className}`}>
                    {planStatusData.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ronda-border">
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">Precio</p>
                    <p className="text-sm font-semibold text-ronda-text">{plan.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ronda-muted uppercase mb-1">Ciclo</p>
                    <p className="text-sm font-semibold text-ronda-text">{plan.cycle}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-ronda-border">
                  <p className="text-xs text-ronda-muted uppercase mb-1">Fuente</p>
                  <p className="text-sm font-semibold text-ronda-text">{plan.source}</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-ronda-text mb-4">Cobros</h2>
              <div className="flex items-center justify-between gap-3 bg-ronda-bg rounded-lg p-4">
                <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusClass[client.paymentStatus]}`}>
                  {statusLabel[client.paymentStatus]}
                </span>
                <p className="text-xs text-ronda-muted">Estado de pago</p>
              </div>
            </div>
          </section>
        </div>

        {/* Locales */}
        {client.restaurants && client.restaurants.length > 0 && (
          <div className="mt-8 pt-8 border-t border-ronda-border">
            <h2 className="text-lg font-semibold text-ronda-text mb-4">Locales ({client.restaurants.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.restaurants.map((restaurant) => {
                const localBilling = formatRestaurantSubscription(restaurant.subscription);

                return (
                <div key={restaurant.id} className="rounded-lg bg-ronda-bg border border-ronda-border p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-ronda-text flex-1">{restaurant.name}</h3>
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                        restaurant.onboardingCompleted
                          ? 'bg-ronda-success/10 text-ronda-success'
                          : 'bg-ronda-gold/10 text-ronda-gold-dark'
                      }`}
                    >
                      {restaurant.onboardingCompleted ? 'Completo' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-ronda-muted">
                    {restaurant.city && <p>📍 {restaurant.city}</p>}
                    <p className="break-all">🌐 {restaurant.portalSubdomain}</p>
                    <p>
                      Pagos:{' '}
                      <span className={statusClass[restaurant.paymentStatus]}>
                        {statusLabel[restaurant.paymentStatus]}
                      </span>
                    </p>
                    <p className="text-ronda-muted/70 pt-2">Creado el {formatDate(restaurant.createdAt)}</p>
                  </div>
                  <div className="mt-4 rounded-lg border border-ronda-border bg-ronda-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-ronda-muted">Billing local</p>
                        <p className="mt-1 text-sm font-semibold text-ronda-text">{localBilling.planName}</p>
                        <p className="text-xs text-ronda-muted">{localBilling.cycle} - {localBilling.renewal}</p>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${localBilling.statusData.className}`}>
                        {localBilling.statusData.label}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 border-t border-ronda-border pt-3 text-xs text-ronda-muted">
                      <p>Sub. externa: {restaurant.subscription?.stripeSubscriptionId ?? '-'}</p>
                      <p>Fin periodo: {restaurant.subscription?.currentPeriodEnd ? formatDate(restaurant.subscription.currentPeriodEnd) : '-'}</p>
                      {restaurant.subscription?.scheduledPlanId ? (
                        <p className="font-semibold text-ronda-gold-dark">
                          Cambio programado: {planNames[restaurant.subscription.scheduledPlanId] ?? restaurant.subscription.scheduledPlanId}
                          {restaurant.subscription.scheduledBillingCycle ? ` - ${restaurant.subscription.scheduledBillingCycle}` : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
