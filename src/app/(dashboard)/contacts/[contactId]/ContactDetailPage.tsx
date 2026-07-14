'use client';

import { useRouter } from 'next/navigation';
import type { StaffCommercialContact, StaffContactStage } from '@/lib/api';

const stageData: Record<StaffContactStage, { label: string; className: string }> = {
  lead: { label: 'Contacto', className: 'bg-slate-100 text-slate-700' },
  visited: { label: 'Visitado', className: 'bg-ronda-bg text-ronda-muted' },
  conversation: { label: 'Conversacion', className: 'bg-blue-50 text-blue-700' },
  meeting: { label: 'Reunion', className: 'bg-violet-50 text-violet-700' },
  proposal: { label: 'Propuesta', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  closed: { label: 'Cerrado', className: 'bg-ronda-success/10 text-ronda-success' },
};

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
}

export function ContactDetailPage({ contact }: { contact: StaffCommercialContact }) {
  const router = useRouter();
  const stage = stageData[contact.stage];

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-ronda-border p-2 text-ronda-muted transition hover:bg-ronda-bg"
            title="Volver"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-semibold text-ronda-text">{contact.restaurantName}</h1>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${stage.className}`}>{stage.label}</span>
            </div>
            <p className="mt-1 text-sm text-ronda-muted">{contact.venueType || 'Sin tipo de local'}</p>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto rounded-lg bg-ronda-surface p-6 outline outline-1 -outline-offset-1 outline-ronda-border">
        <div className="grid max-w-7xl gap-8 lg:grid-cols-3">
          <section className="space-y-5">
            <SectionTitle>Informacion principal</SectionTitle>
            <DetailRow label="Persona principal" value={contact.contactName} />
            <DetailRow label="Telefono" value={contact.phone} />
            <DetailRow label="Email" value={contact.email} />
            <DetailRow label="Responsable" value={contact.owner} />
            <DetailRow label="Creado" value={formatDate(contact.createdAt)} />
            <DetailRow label="Ultima actividad" value={formatDate(contact.lastActivity)} />
          </section>

          <section className="space-y-5">
            <SectionTitle>Localizacion</SectionTitle>
            <DetailRow label="Direccion" value={contact.address} />
            <DetailRow label="Ciudad" value={contact.city} />
            <DetailRow label="Provincia" value={contact.province} />
            <DetailRow label="Codigo postal" value={contact.postalCode} />
            <DetailRow label="Coordenadas" value={contact.lat !== null && contact.lng !== null ? `${contact.lat}, ${contact.lng}` : null} />
          </section>

          <section className="space-y-5">
            <SectionTitle>Evaluacion</SectionTitle>
            <div className="rounded-lg bg-ronda-bg p-4">
              <p className="text-xs uppercase text-ronda-muted">Puntuacion</p>
              <p className="mt-1 text-2xl font-semibold text-ronda-text">
                {contact.evaluation ? `${contact.evaluation.score}/${contact.evaluation.maxScore ?? 34}` : 'Sin evaluar'}
              </p>
              <p className="mt-2 text-sm text-ronda-muted">{contact.evaluation?.label || 'Todavia no hay evaluacion comercial.'}</p>
            </div>
          </section>
        </div>

        <div className="mt-8 grid max-w-7xl gap-8 border-t border-ronda-border pt-8 lg:grid-cols-2">
          <section>
            <SectionTitle>Personas asociadas ({contact.people.length})</SectionTitle>
            {contact.people.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-ronda-border bg-ronda-bg px-4 py-3 text-sm text-ronda-muted">
                Sin personas asociadas.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {contact.people.map((person) => (
                  <div key={person.id} className="rounded-lg border border-ronda-border bg-ronda-bg p-4">
                    <p className="text-sm font-semibold text-ronda-text">{person.name}</p>
                    <p className="mt-1 text-xs text-ronda-muted">{person.role || 'Sin cargo'}</p>
                    <p className="mt-3 text-sm text-ronda-text">{person.phone || 'Sin telefono'}</p>
                    <p className="mt-1 break-all text-sm text-ronda-muted">{person.email || 'Sin email'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <SectionTitle>Notas y redes</SectionTitle>
            <DetailRow label="Notas" value={contact.notes} />
            <DetailRow label="Web" value={contact.web} />
            <DetailRow label="Instagram" value={contact.instagram} />
            <DetailRow label="TikTok" value={contact.tiktok} />
            <DetailRow label="Google Maps" value={contact.googleMapsUrl} />
          </section>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-ronda-text">{children}</h2>;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-ronda-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-ronda-text">{value || 'Sin datos'}</p>
    </div>
  );
}
