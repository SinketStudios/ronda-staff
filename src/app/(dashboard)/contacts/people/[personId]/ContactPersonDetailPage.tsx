'use client';

import { useRouter } from 'next/navigation';
import type { StaffContactPersonListItem, StaffContactStage } from '@/lib/api';

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

export function ContactPersonDetailPage({ person }: { person: StaffContactPersonListItem }) {
  const router = useRouter();
  const stage = stageData[person.stage];

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <header className="flex shrink-0 items-start gap-3">
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
            <h1 className="truncate text-3xl font-semibold text-ronda-text">{person.name}</h1>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${stage.className}`}>{stage.label}</span>
          </div>
          <p className="mt-1 text-sm text-ronda-muted">{person.role || 'Sin cargo'}</p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto rounded-lg bg-ronda-surface p-6 outline outline-1 -outline-offset-1 outline-ronda-border">
        <div className="grid max-w-5xl gap-8 lg:grid-cols-3">
          <section className="space-y-5">
            <SectionTitle>Datos de contacto</SectionTitle>
            <DetailRow label="Telefono" value={person.phone} />
            <DetailRow label="Email" value={person.email} />
            <DetailRow label="Ciudad" value={person.city} />
            <DetailRow label="Local asociado" value={person.linkedEntity} />
          </section>

          <section className="space-y-5">
            <SectionTitle>Seguimiento</SectionTitle>
            <DetailRow label="Responsable" value={person.owner} />
            <DetailRow label="Potencial" value={person.potential ? `${person.potential}/34` : 'Sin evaluar'} />
            <DetailRow label="Ultima actividad" value={formatDate(person.lastActivity)} />
            <DetailRow label="Creado" value={formatDate(person.createdAt)} />
          </section>

          <section>
            <SectionTitle>Estado comercial</SectionTitle>
            <div className="mt-4 rounded-lg bg-ronda-bg p-4">
              <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${stage.className}`}>{stage.label}</span>
              <p className="mt-4 text-sm text-ronda-muted">
                {person.linkedEntity
                  ? 'Persona asociada a un local comercial registrado.'
                  : 'Persona registrada sin local asociado.'}
              </p>
            </div>
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
