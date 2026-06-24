'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffClient, type CreateStaffClientInput, type StaffClient } from '@/lib/api';
import { ClientsTable } from './ClientsTable';

interface ClientsPageClientProps {
  clients: StaffClient[];
  onSelectClient: (client: StaffClient) => void;
}

export function ClientsPageClient({ clients, onSelectClient }: ClientsPageClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
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
        <div className="grid gap-3 sm:min-w-[470px]">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface">
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
              <p className="text-xs font-semibold uppercase text-ronda-muted">Revision</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark sm:justify-self-end"
          >
            Anadir cliente
          </button>
        </div>
      </header>

      <ClientsTable clients={clients} onSelectClient={onSelectClient} />

      {createOpen ? (
        <CreateClientModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

const initialForm: CreateStaffClientInput = {
  organizationName: '',
  legalName: '',
  companyType: 'Sociedad Limitada (S.L.)',
  taxId: '',
  phone: '',
  country: 'ES',
  ownerName: '',
  ownerEmail: '',
  planId: 'demo',
  billingCycle: 'monthly',
  trialDays: 14,
};

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateStaffClientInput>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CreateStaffClientInput>(key: K, value: CreateStaffClientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createStaffClient({
        ...form,
        organizationName: form.organizationName.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        legalName: form.legalName?.trim() || undefined,
        companyType: form.companyType?.trim() || undefined,
        taxId: form.taxId?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        country: form.country?.trim() || undefined,
        billingCycle: form.planId === 'demo' ? 'monthly' : form.billingCycle,
        trialDays: form.planId === 'demo' ? undefined : form.trialDays,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ronda-coffee/45 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-lg border border-ronda-border bg-ronda-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ronda-text">Anadir cliente</h2>
            <p className="mt-1 text-sm text-ronda-muted">Crea la organizacion, propietario y plan asignado.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-ronda-muted transition hover:bg-ronda-bg">
            Cerrar
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Organizacion" value={form.organizationName} onChange={(value) => update('organizationName', value)} required />
          <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
            Tipo de sociedad
            <select value={form.companyType ?? 'SL'} onChange={(event) => update('companyType', event.target.value)} className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold">
              <option value="Sociedad Limitada (S.L.)">Sociedad Limitada (S.L.)</option>
              <option value="Sociedad Limitada Unipersonal (S.L.U.)">Sociedad Limitada Unipersonal (S.L.U.)</option>
              <option value="Sociedad Anonima (S.A.)">Sociedad Anonima (S.A.)</option>
              <option value="Sociedad Anonima Unipersonal (S.A.U.)">Sociedad Anonima Unipersonal (S.A.U.)</option>
              <option value="Autonomo">Autonomo</option>
              <option value="Comunidad de Bienes (C.B.)">Comunidad de Bienes (C.B.)</option>
              <option value="Sociedad Cooperativa (S. Coop.)">Sociedad Cooperativa (S. Coop.)</option>
              <option value="Asociacion">Asociacion</option>
              <option value="Otro">Otro</option>
            </select>
          </label>
          <Field label="CIF/NIF" value={form.taxId ?? ''} onChange={(value) => update('taxId', value)} />
          <Field label="Telefono" value={form.phone ?? ''} onChange={(value) => update('phone', value)} />
          <Field label="Nombre y apellidos" value={form.ownerName} onChange={(value) => update('ownerName', value)} required />
          <Field label="Email" type="email" value={form.ownerEmail} onChange={(value) => update('ownerEmail', value)} required />
          <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
            Pais
            <select value={form.country ?? 'ES'} onChange={(event) => update('country', event.target.value)} className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold">
              <option value="ES">🇪🇸 España</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
            Plan
            <select value={form.planId} onChange={(event) => update('planId', event.target.value as CreateStaffClientInput['planId'])} className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold">
              <option value="demo">Demo</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </select>
          </label>
          {form.planId !== 'demo' ? (
            <>
              <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
                Ciclo
                <select value={form.billingCycle} onChange={(event) => update('billingCycle', event.target.value as CreateStaffClientInput['billingCycle'])} className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold">
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted md:col-span-2">
                Dias de prueba iniciales
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={form.trialDays ?? 14}
                  onChange={(event) => update('trialDays', Number(event.target.value))}
                  className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
                />
                <span className="text-xs font-medium normal-case text-ronda-muted">
                  Usa 14 para replicar el onboarding actual. Usa 0 si quieres dejarlo pendiente de pago hasta que active Stripe.
                </span>
              </label>
            </>
          ) : (
            <div className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-muted md:col-span-2">
              Demo es permanente, no caduca y no crea suscripcion en Stripe. El cliente recibira un email para activar la cuenta y crear su primer local desde el onboarding.
            </div>
          )}
        </div>

        {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-ronda-error">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? 'Creando...' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      />
    </label>
  );
}
