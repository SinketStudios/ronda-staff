'use client';

import { useState } from 'react';
import {
  deleteStaffContactPeople,
  deleteStaffContacts,
  type StaffCommercialContact,
  type StaffContactPersonListItem,
} from '@/lib/api';

type ContactDetailSelection =
  | { type: 'contact'; item: StaffCommercialContact }
  | { type: 'person'; item: StaffContactPersonListItem };

const stageData = {
  lead: { label: 'Contacto', className: 'bg-slate-100 text-slate-700' },
  visited: { label: 'Visitado', className: 'bg-ronda-bg text-ronda-muted' },
  conversation: { label: 'Conversación', className: 'bg-blue-50 text-blue-700' },
  meeting: { label: 'Reunión', className: 'bg-violet-50 text-violet-700' },
  proposal: { label: 'Propuesta', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  closed: { label: 'Cerrado', className: 'bg-ronda-success/10 text-ronda-success' },
} as const;

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ContactDetailSidebar({ selection, onClose }: { selection: ContactDetailSelection; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const isContact = selection.type === 'contact';
  const title = isContact ? selection.item.restaurantName : selection.item.name;

  async function handleDelete() {
    if (deleting) return;
    const message = isContact ? '¿Eliminar este local de contactos?' : '¿Eliminar esta persona de contactos?';
    if (!window.confirm(message)) return;

    setDeleting(true);
    setError('');
    try {
      if (isContact) await deleteStaffContacts([selection.item.id]);
      else await deleteStaffContactPeople([selection.item.id]);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el contacto');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border-l border-ronda-border bg-ronda-surface">
      <div className="shrink-0 border-b border-ronda-border bg-ronda-surface/80">
        <div className="flex h-20 items-center justify-between gap-2 px-6 py-4">
          <h2 className="text-lg font-semibold text-ronda-text">Detalles</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
              aria-label="Editar"
              title="Editar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-2 text-ronda-error transition hover:bg-red-50 disabled:opacity-50"
              aria-label={isContact ? 'Eliminar local' : 'Eliminar persona'}
              title={isContact ? 'Eliminar local' : 'Eliminar persona'}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001-1V5a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 001 1m-8 0h8" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase text-ronda-muted">{isContact ? 'Local' : 'Persona'}</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ronda-text">{title}</p>
              <p className="mt-1 text-xs text-ronda-muted">
                {isContact ? selection.item.venueType || 'Sin tipo de local' : selection.item.role || 'Sin cargo'}
              </p>
            </div>
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${stageData[selection.item.stage].className}`}>
              {stageData[selection.item.stage].label}
            </span>
          </div>
        </section>

        {isContact ? <ContactContent contact={selection.item} /> : <PersonContent person={selection.item} />}

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-ronda-error">{error}</p> : null}
      </div>
    </aside>
  );
}

function ContactContent({ contact }: { contact: StaffCommercialContact }) {
  return (
    <>
      <DetailSection title="Contacto">
        <DetailRow label="Persona principal" value={contact.contactName} />
        <DetailRow label="Teléfono" value={contact.phone} />
        <DetailRow label="Email" value={contact.email} />
      </DetailSection>

      <DetailSection title="Localización">
        <DetailRow label="Dirección" value={contact.address} />
        <DetailRow label="Ciudad" value={contact.city} />
        <DetailRow label="Provincia" value={contact.province} />
        <DetailRow label="Código postal" value={contact.postalCode} />
      </DetailSection>

      <DetailSection title={`Personas asociadas (${contact.people.length})`}>
        {contact.people.length === 0 ? (
          <p className="text-sm text-ronda-muted">Sin personas asociadas</p>
        ) : (
          <div className="space-y-2">
            {contact.people.map((person) => (
              <div key={person.id} className="rounded-lg bg-ronda-bg p-3">
                <p className="text-sm font-medium text-ronda-text">{person.name}</p>
                <p className="mt-1 text-xs text-ronda-muted">{person.role || 'Sin cargo'}</p>
                <p className="mt-1 text-xs text-ronda-muted">{person.phone || person.email || 'Sin datos'}</p>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="Evaluación">
        <DetailRow label="Puntuación" value={contact.evaluation ? `${contact.evaluation.score}/${contact.evaluation.maxScore ?? 34}` : 'Sin evaluar'} />
        <DetailRow label="Etiqueta" value={contact.evaluation?.label} />
        <DetailRow label="Última actividad" value={formatDate(contact.lastActivity)} />
      </DetailSection>

      <DetailSection title="Notas y redes">
        <DetailRow label="Notas" value={contact.notes} />
        <DetailRow label="Web" value={contact.web} />
        <DetailRow label="Instagram" value={contact.instagram} />
        <DetailRow label="TikTok" value={contact.tiktok} />
        <DetailRow label="Google Maps" value={contact.googleMapsUrl} />
      </DetailSection>
    </>
  );
}

function PersonContent({ person }: { person: StaffContactPersonListItem }) {
  return (
    <>
      <DetailSection title="Datos de contacto">
        <DetailRow label="Teléfono" value={person.phone} />
        <DetailRow label="Email" value={person.email} />
        <DetailRow label="Ciudad" value={person.city} />
        <DetailRow label="Local asociado" value={person.linkedEntity} />
      </DetailSection>

      <DetailSection title="Seguimiento">
        <DetailRow label="Responsable" value={person.owner} />
        <DetailRow label="Potencial" value={person.potential ? `${person.potential}/34` : 'Sin evaluar'} />
        <DetailRow label="Última actividad" value={formatDate(person.lastActivity)} />
        <DetailRow label="Creado" value={formatDate(person.createdAt)} />
      </DetailSection>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase text-ronda-muted">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-ronda-muted">{label}</p>
      <p className="break-words text-sm font-medium text-ronda-text">{value || 'Sin datos'}</p>
    </div>
  );
}
