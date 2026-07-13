'use client';

import { useRouter } from 'next/navigation';
import type { RestaurantBillingSubscription, StaffClient } from '@/lib/api';
import { ClientDeleteButton } from './ClientDeleteButton';
import { ClientResendInvitationButton } from './ClientResendInvitationButton';

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
  demo: 'Demo',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

function formatSubscriptionStatus(status: string | null) {
  return status
    ? subscriptionStatus[status] ?? { label: status, className: 'bg-ronda-bg text-ronda-muted' }
    : { label: 'Sin suscripción', className: 'bg-ronda-bg text-ronda-muted' };
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

interface ClientDetailSidebarProps {
  client: StaffClient | null;
  onClose: () => void;
}

export function ClientDetailSidebar({ client, onClose }: ClientDetailSidebarProps) {
  const router = useRouter();
  if (!client) return null;

  const plan = formatPlan(client);
  const planStatusData = formatSubscriptionStatus(client.subscription.status);

  return (
    <aside className="w-full h-full flex flex-col border-l border-ronda-border bg-ronda-surface overflow-hidden rounded-lg">
      <div className="border-b border-ronda-border bg-ronda-surface/80 shrink-0">
        <div className="px-6 py-4 flex items-center justify-between gap-2 h-20">
        <h2 className="text-lg font-semibold text-ronda-text">Detalles</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/clients/${client.id}`);
            }}
            className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            aria-label="Ver"
            title="Ver"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            aria-label="Editar"
            title="Editar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <ClientDeleteButton client={client} onDeleted={onClose} variant="icon" />
          <ClientResendInvitationButton client={client} variant="icon" />
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-auto flex-1">
        {/* Organization Info */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Organizacion</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ronda-text">{client.name}</p>
              <p className="text-xs text-ronda-muted mt-1">{client.legalName || 'Sin nombre legal'}</p>
            </div>
            {client.taxId && (
              <div>
                <p className="text-xs text-ronda-muted">NIF/CIF</p>
                <p className="text-sm font-medium text-ronda-text">{client.taxId}</p>
              </div>
            )}
            {client.email && (
              <div>
                <p className="text-xs text-ronda-muted">Email</p>
                <p className="text-sm text-ronda-text break-all">{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-ronda-muted">Teléfono</p>
                <p className="text-sm text-ronda-text">{client.phone}</p>
              </div>
            )}
            {client.country && (
              <div>
                <p className="text-xs text-ronda-muted">Pais</p>
                <p className="text-sm text-ronda-text">{client.country}</p>
              </div>
            )}
          </div>
        </section>

        {/* Owner Info */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Propietario</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-ronda-muted">Nombre</p>
              <p className="text-sm font-medium text-ronda-text">{client.owner.name}</p>
            </div>
            <div>
              <p className="text-xs text-ronda-muted">Email</p>
              <p className="text-sm text-ronda-text break-all">{client.owner.email}</p>
            </div>
          </div>
        </section>

        {/* Subscription */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Suscripcion</h3>
          <div className="space-y-3 bg-ronda-bg rounded-lg p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-ronda-muted">Plan</p>
                <p className="text-sm font-medium text-ronda-text">{plan.name}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${planStatusData.className}`}>
                {planStatusData.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ronda-border">
              <div>
                <p className="text-xs text-ronda-muted">Precio</p>
                <p className="text-sm font-semibold text-ronda-text">{plan.price}</p>
              </div>
              <div>
                <p className="text-xs text-ronda-muted">Ciclo</p>
                <p className="text-sm font-semibold text-ronda-text">{plan.cycle}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-ronda-muted">Fuente</p>
              <p className="text-sm font-semibold text-ronda-text">{plan.source}</p>
            </div>
          </div>
        </section>

        {/* Payment Status */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Cobros</h3>
          <div className="flex items-center justify-between gap-3 bg-ronda-bg rounded-lg p-4">
            <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${statusClass[client.paymentStatus]}`}>
              {statusLabel[client.paymentStatus]}
            </span>
            <p className="text-xs text-ronda-muted">Estado de pago</p>
          </div>
        </section>

        {/* Restaurants */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Locales ({client.restaurantsCount})</h3>
          {client.restaurantsCount === 0 ? (
            <p className="text-sm text-ronda-muted">Sin locales registrados</p>
          ) : (
            <div className="space-y-2">
              {client.restaurants?.map((restaurant) => (
                <div key={restaurant.id} className="rounded-lg bg-ronda-bg p-3">
                  {(() => {
                    const localBilling = formatRestaurantSubscription(restaurant.subscription);
                    return (
                      <>
                  <p className="text-sm font-medium text-ronda-text">{restaurant.name}</p>
                  <div className="flex items-center justify-between gap-2 mt-2 text-xs text-ronda-muted">
                    {restaurant.city && <span>{restaurant.city}</span>}
                    <span className={`rounded px-2 py-1 ${restaurant.onboardingCompleted ? 'bg-ronda-success/10 text-ronda-success' : 'bg-ronda-gold/10 text-ronda-gold-dark'}`}>
                      {restaurant.onboardingCompleted ? 'Completo' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-ronda-border pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-ronda-muted">Plan local</p>
                        <p className="text-sm font-semibold text-ronda-text">{localBilling.planName}</p>
                        <p className="text-xs text-ronda-muted">{localBilling.cycle} - {localBilling.renewal}</p>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${localBilling.statusData.className}`}>
                        {localBilling.statusData.label}
                      </span>
                    </div>
                    {restaurant.subscription?.currentPeriodEnd ? (
                      <p className="mt-2 text-xs text-ronda-muted">Fin periodo: {formatDate(restaurant.subscription.currentPeriodEnd)}</p>
                    ) : null}
                    {restaurant.subscription?.scheduledPlanId ? (
                      <p className="mt-1 text-xs font-semibold text-ronda-gold-dark">
                        Cambio programado: {planNames[restaurant.subscription.scheduledPlanId] ?? restaurant.subscription.scheduledPlanId}
                      </p>
                    ) : null}
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dates */}
        <section className="text-xs text-ronda-muted space-y-2 pt-4 border-t border-ronda-border">
          <div>
            <p className="text-ronda-muted/70">Creado el</p>
            <p className="font-medium text-ronda-text">{formatDate(client.createdAt)}</p>
          </div>
        </section>
      </div>
    </aside>
  );
}
