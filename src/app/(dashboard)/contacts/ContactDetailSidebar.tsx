'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteStaffContactPeople,
  deleteStaffContacts,
  updateStaffContact,
  updateStaffContactPerson,
  type StaffCommercialContact,
  type StaffContactPersonListItem,
  type StaffContactStage,
} from '@/lib/api';
import { useDashboard } from '../DashboardContext';

export type ContactDetailSelection =
  | { type: 'contact'; item: StaffCommercialContact }
  | { type: 'person'; item: StaffContactPersonListItem };

type ContactEditDraft = {
  localName: string;
  venueType: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  stage: StaffContactStage;
  notes: string;
  web: string;
  instagram: string;
  tiktok: string;
  googleMapsUrl: string;
  people: Array<{ id: string; name: string; firstName: string; lastName: string; role: string; phone: string; email: string; socialLinks: string; workingHours: string; commercialRelation: string }>;
};

type PersonEditDraft = {
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
  socialLinks: string;
  workingHours: string;
  commercialRelation: string;
};

const stageData: Record<StaffContactStage, { label: string; className: string }> = {
  lead: { label: 'Contacto', className: 'bg-slate-100 text-slate-700' },
  visited: { label: 'Visitado', className: 'bg-ronda-bg text-ronda-muted' },
  conversation: { label: 'Conversación', className: 'bg-blue-50 text-blue-700' },
  meeting: { label: 'Reunión', className: 'bg-violet-50 text-violet-700' },
  proposal: { label: 'Propuesta', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  closed: { label: 'Cerrado', className: 'bg-ronda-success/10 text-ronda-success' },
};

const stageOptions: Array<{ value: StaffContactStage; label: string }> = [
  { value: 'lead', label: 'Contacto' },
  { value: 'visited', label: 'Visitado' },
  { value: 'conversation', label: 'Conversación' },
  { value: 'meeting', label: 'Reunión' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'closed', label: 'Cerrado' },
];

const hospitalityRoles = [
  'Propietario',
  'Socio',
  'Franquiciado',
  'Director general',
  'Director de operaciones',
  'Gerente',
  'Subgerente',
  'Encargado',
  'Responsable de turno',
  'Responsable de sala',
  'Maitre',
  'Host / Recepción',
  'Camarero',
  'Jefe de rango',
  'Runner',
  'Cajero',
  'Jefe de barra',
  'Bartender',
  'Barista',
  'Sommelier',
  'Jefe de cocina',
  'Chef ejecutivo',
  'Segundo de cocina',
  'Cocinero',
  'Ayudante de cocina',
  'Pastelero / Repostero',
  'Pizzero',
  'Parrillero',
  'Office / Lavaplatos',
  'Responsable de delivery',
  'Repartidor',
  'Responsable de compras',
  'Responsable de proveedores',
  'Administración',
  'Contabilidad',
  'Marketing',
  'Recursos humanos',
  'Mantenimiento',
  'Limpieza',
  'Seguridad',
  'Otro',
];

const workShiftOptions = ['Mañana', 'Tarde', 'Noche', 'Partido', 'Flexible'];

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function makeContactDraft(contact: StaffCommercialContact): ContactEditDraft {
  return {
    localName: contact.restaurantName,
    venueType: contact.venueType ?? '',
    phone: contact.phone ?? '',
    email: contact.email ?? '',
    address: contact.address ?? '',
    city: contact.city ?? '',
    province: contact.province ?? '',
    postalCode: contact.postalCode ?? '',
    stage: contact.stage,
    notes: contact.notes ?? '',
    web: contact.web ?? '',
    instagram: contact.instagram ?? '',
    tiktok: contact.tiktok ?? '',
    googleMapsUrl: contact.googleMapsUrl ?? '',
    people: contact.people.map((person) => ({
      id: person.id,
      name: person.name,
      firstName: person.firstName ?? '',
      lastName: person.lastName ?? '',
      role: person.role ?? '',
      phone: person.phone ?? '',
      email: person.email ?? '',
      socialLinks: person.socialLinks ?? '',
      workingHours: person.workingHours ?? '',
      commercialRelation: person.commercialRelation ?? '',
    })),
  };
}

function makePersonDraft(person: StaffContactPersonListItem): PersonEditDraft {
  return {
    name: person.name,
    firstName: person.firstName ?? '',
    lastName: person.lastName ?? '',
    role: person.role ?? '',
    phone: person.phone ?? '',
    email: person.email ?? '',
    socialLinks: person.socialLinks ?? '',
    workingHours: person.workingHours ?? '',
    commercialRelation: person.commercialRelation ?? '',
  };
}

function notifyContactsUpdated() {
  window.dispatchEvent(new Event('ronda:contacts-updated'));
}

export function ContactDetailSidebar({
  selection,
  onClose,
  defaultEditing = false,
  onContactUpdated,
  onPersonUpdated,
}: {
  selection: ContactDetailSelection;
  onClose: () => void;
  defaultEditing?: boolean;
  onContactUpdated?: (contact: StaffCommercialContact) => void;
  onPersonUpdated?: (person: StaffContactPersonListItem) => void;
}) {
  const { setSelectedContact, setSelectedContactPerson } = useDashboard();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(defaultEditing);
  const [error, setError] = useState('');
  const isContact = selection.type === 'contact';
  const title = isContact ? selection.item.restaurantName : selection.item.name;
  const [contactDraft, setContactDraft] = useState<ContactEditDraft | null>(() => (isContact ? makeContactDraft(selection.item) : null));
  const [personDraft, setPersonDraft] = useState<PersonEditDraft | null>(() => (!isContact ? makePersonDraft(selection.item) : null));

  useEffect(() => {
    setEditing(defaultEditing);
    setError('');
    setContactDraft(selection.type === 'contact' ? makeContactDraft(selection.item) : null);
    setPersonDraft(selection.type === 'person' ? makePersonDraft(selection.item) : null);
  }, [defaultEditing, selection]);

  const hasChanges = useMemo(() => {
    if (selection.type === 'contact' && contactDraft) {
      return JSON.stringify(contactDraft) !== JSON.stringify(makeContactDraft(selection.item));
    }
    if (selection.type === 'person' && personDraft) {
      return JSON.stringify(personDraft) !== JSON.stringify(makePersonDraft(selection.item));
    }
    return false;
  }, [contactDraft, personDraft, selection]);

  async function handleDelete() {
    if (deleting) return;
    const message = isContact ? 'Eliminar este local de contactos?' : 'Eliminar esta persona de contactos?';
    if (!window.confirm(message)) return;

    setDeleting(true);
    setError('');
    try {
      if (isContact) await deleteStaffContacts([selection.item.id]);
      else await deleteStaffContactPeople([selection.item.id]);
      notifyContactsUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el contacto');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      if (selection.type === 'contact' && contactDraft) {
        if (!contactDraft.localName.trim()) {
          setError('El nombre del local es obligatorio.');
          return;
        }

        const updated = await updateStaffContact(selection.item.id, {
          localName: contactDraft.localName.trim(),
          venueType: clean(contactDraft.venueType),
          phone: clean(contactDraft.phone),
          email: clean(contactDraft.email),
          notes: clean(contactDraft.notes),
          location: {
            address: clean(contactDraft.address),
            city: clean(contactDraft.city),
            province: clean(contactDraft.province),
            postalCode: clean(contactDraft.postalCode),
          },
          web: clean(contactDraft.web),
          instagram: clean(contactDraft.instagram),
          tiktok: clean(contactDraft.tiktok),
          googleMapsUrl: clean(contactDraft.googleMapsUrl),
          stage: contactDraft.stage,
          people: contactDraft.people
            .filter((person) => person.name.trim())
            .map((person) => ({
              name: person.name.trim(),
              firstName: clean(person.firstName),
              lastName: clean(person.lastName),
              role: clean(person.role),
              phone: clean(person.phone),
              email: clean(person.email),
              socialLinks: clean(person.socialLinks),
              workingHours: clean(person.workingHours),
              commercialRelation: clean(person.commercialRelation),
            })),
        });

        setSelectedContact(updated);
        onContactUpdated?.(updated);
        setContactDraft(makeContactDraft(updated));
      }

      if (selection.type === 'person' && personDraft) {
        if (!personDraft.name.trim()) {
          setError('El nombre de la persona es obligatorio.');
          return;
        }

        const updated = await updateStaffContactPerson(selection.item.id, {
          name: personDraft.name.trim(),
          firstName: clean(personDraft.firstName),
          lastName: clean(personDraft.lastName),
          role: clean(personDraft.role),
          phone: clean(personDraft.phone),
          email: clean(personDraft.email),
          socialLinks: clean(personDraft.socialLinks),
          workingHours: clean(personDraft.workingHours),
          commercialRelation: clean(personDraft.commercialRelation),
        });
        setSelectedContactPerson({
          ...selection.item,
          name: updated.name,
          firstName: updated.firstName ?? '',
          lastName: updated.lastName ?? '',
          role: updated.role ?? '',
          phone: updated.phone ?? '',
          email: updated.email ?? '',
          socialLinks: updated.socialLinks ?? '',
          workingHours: updated.workingHours ?? '',
          commercialRelation: updated.commercialRelation ?? '',
        });
        const nextPerson = { ...selection.item, name: updated.name, firstName: updated.firstName ?? '', lastName: updated.lastName ?? '', role: updated.role ?? '', phone: updated.phone ?? '', email: updated.email ?? '', socialLinks: updated.socialLinks ?? '', workingHours: updated.workingHours ?? '', commercialRelation: updated.commercialRelation ?? '' };
        onPersonUpdated?.(nextPerson);
        setPersonDraft(makePersonDraft(nextPerson));
      }

      setEditing(false);
      notifyContactsUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border-l border-ronda-border bg-ronda-surface">
      <div className="shrink-0 border-b border-ronda-border bg-ronda-surface/80">
        <div className="flex h-20 items-center justify-between gap-2 px-6 py-4">
          <h2 className="text-lg font-semibold text-ronda-text">{editing ? 'Editar' : 'Detalles'}</h2>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError('');
                    setContactDraft(selection.type === 'contact' ? makeContactDraft(selection.item) : null);
                    setPersonDraft(selection.type === 'person' ? makePersonDraft(selection.item) : null);
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!hasChanges || saving}
                  className="rounded-lg bg-ronda-coffee px-3 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(isContact ? `/contacts/${selection.item.id}` : `/contacts/people/${selection.item.id}`);
                  }}
                  className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
                  aria-label="Ver detalle"
                  title="Ver detalle"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
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
              </>
            )}
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
        {editing ? (
          isContact && contactDraft ? (
            <ContactEditForm draft={contactDraft} onChange={setContactDraft} />
          ) : personDraft ? (
            <PersonEditForm draft={personDraft} onChange={setPersonDraft} />
          ) : null
        ) : (
          <>
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
          </>
        )}

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-ronda-error">{error}</p> : null}
      </div>
    </aside>
  );
}

function ContactEditForm({ draft, onChange }: { draft: ContactEditDraft; onChange: (draft: ContactEditDraft) => void }) {
  function update<K extends keyof ContactEditDraft>(key: K, value: ContactEditDraft[K]) {
    onChange({ ...draft, [key]: value });
  }

  function updatePerson(id: string, key: 'name' | 'firstName' | 'lastName' | 'role' | 'phone' | 'email' | 'socialLinks' | 'workingHours' | 'commercialRelation', value: string) {
    update(
      'people',
      draft.people.map((person) => (person.id === id ? { ...person, [key]: value } : person)),
    );
  }

  function addPerson() {
    update('people', [...draft.people, { id: crypto.randomUUID(), name: '', firstName: '', lastName: '', role: '', phone: '', email: '', socialLinks: '', workingHours: '', commercialRelation: '' }]);
  }

  function removePerson(id: string) {
    update('people', draft.people.filter((person) => person.id !== id));
  }

  return (
    <>
      <DetailSection title="Información básica">
        <EditField label="Nombre del local" value={draft.localName} onChange={(value) => update('localName', value)} required />
        <EditField label="Tipo de local" value={draft.venueType} onChange={(value) => update('venueType', value)} />
        <EditField label="Teléfono" value={draft.phone} onChange={(value) => update('phone', value)} />
        <EditField label="Email" value={draft.email} onChange={(value) => update('email', value)} type="email" />
        <EditSelect label="Estado" value={draft.stage} onChange={(value) => update('stage', value)} />
      </DetailSection>

      <DetailSection title="Localizacion">
        <EditField label="Dirección" value={draft.address} onChange={(value) => update('address', value)} />
        <EditField label="Ciudad" value={draft.city} onChange={(value) => update('city', value)} />
        <EditField label="Provincia" value={draft.province} onChange={(value) => update('province', value)} />
        <EditField label="C?digo postal" value={draft.postalCode} onChange={(value) => update('postalCode', value)} />
      </DetailSection>

      <DetailSection title="Personas asociadas">
        <button
          type="button"
          onClick={addPerson}
          className="mb-3 min-h-9 rounded-lg border border-ronda-border bg-white px-3 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg"
        >
          Anadir persona
        </button>
        {draft.people.length === 0 ? <p className="text-sm text-ronda-muted">Sin personas asociadas</p> : null}
        <div className="space-y-4">
          {draft.people.map((person, index) => (
            <div key={person.id} className="rounded-lg bg-ronda-bg p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ronda-text">Persona {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removePerson(person.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-ronda-muted transition hover:bg-white"
                >
                  Quitar
                </button>
              </div>
              <div className="grid gap-3">
                <EditField label="Nombre visible" value={person.name} onChange={(value) => updatePerson(person.id, 'name', value)} />
                <EditField label="Nombre" value={person.firstName} onChange={(value) => updatePerson(person.id, 'firstName', value)} />
                <EditField label="Apellidos" value={person.lastName} onChange={(value) => updatePerson(person.id, 'lastName', value)} />
                <RoleSelect value={person.role} onChange={(value) => updatePerson(person.id, 'role', value)} />
                <EditField label="Teléfono" value={person.phone} onChange={(value) => updatePerson(person.id, 'phone', value)} />
                <EditField label="Email" value={person.email} onChange={(value) => updatePerson(person.id, 'email', value)} type="email" />
                <EditField label="Redes sociales" value={person.socialLinks} onChange={(value) => updatePerson(person.id, 'socialLinks', value)} />
                <EditWorkScheduleField value={person.workingHours} onChange={(value) => updatePerson(person.id, 'workingHours', value)} />
                <EditField label="Relación comercial" value={person.commercialRelation} onChange={(value) => updatePerson(person.id, 'commercialRelation', value)} />
              </div>
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="Notas y redes">
        <EditTextarea label="Notas" value={draft.notes} onChange={(value) => update('notes', value)} />
        <EditField label="Web" value={draft.web} onChange={(value) => update('web', value)} />
        <EditField label="Instagram" value={draft.instagram} onChange={(value) => update('instagram', value)} />
        <EditField label="TikTok" value={draft.tiktok} onChange={(value) => update('tiktok', value)} />
        <EditField label="Google Maps" value={draft.googleMapsUrl} onChange={(value) => update('googleMapsUrl', value)} />
      </DetailSection>
    </>
  );
}

function PersonEditForm({ draft, onChange }: { draft: PersonEditDraft; onChange: (draft: PersonEditDraft) => void }) {
  return (
    <DetailSection title="Datos de la persona">
      <EditField label="Nombre visible" value={draft.name} onChange={(value) => onChange({ ...draft, name: value })} required />
      <EditField label="Nombre" value={draft.firstName} onChange={(value) => onChange({ ...draft, firstName: value })} />
      <EditField label="Apellidos" value={draft.lastName} onChange={(value) => onChange({ ...draft, lastName: value })} />
      <RoleSelect value={draft.role} onChange={(value) => onChange({ ...draft, role: value })} />
      <EditField label="Teléfono" value={draft.phone} onChange={(value) => onChange({ ...draft, phone: value })} />
      <EditField label="Email" value={draft.email} onChange={(value) => onChange({ ...draft, email: value })} type="email" />
      <EditField label="Redes sociales" value={draft.socialLinks} onChange={(value) => onChange({ ...draft, socialLinks: value })} />
      <EditWorkScheduleField value={draft.workingHours} onChange={(value) => onChange({ ...draft, workingHours: value })} />
      <EditField label="Relación comercial" value={draft.commercialRelation} onChange={(value) => onChange({ ...draft, commercialRelation: value })} />
    </DetailSection>
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

      <DetailSection title="Localizacion">
        <DetailRow label="Dirección" value={contact.address} />
        <DetailRow label="Ciudad" value={contact.city} />
        <DetailRow label="Provincia" value={contact.province} />
        <DetailRow label="C?digo postal" value={contact.postalCode} />
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
                {person.commercialRelation ? <p className="mt-1 text-xs text-ronda-muted">{person.commercialRelation}</p> : null}
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <DetailSection title="Evaluación">
        <DetailRow label="Puntuación" value={contact.evaluation ? `${contact.evaluation.score}/${contact.evaluation.maxScore ?? 34}` : 'Sin evaluar'} />
        <DetailRow label="Etiqueta" value={contact.evaluation?.label} />
        <DetailRow label="?ltima actividad" value={formatDate(contact.lastActivity)} />
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
        <DetailRow label="Nombre" value={person.firstName} />
        <DetailRow label="Apellidos" value={person.lastName} />
        <DetailRow label="Teléfono" value={person.phone} />
        <DetailRow label="Email" value={person.email} />
        <DetailRow label="Redes sociales" value={person.socialLinks} />
        <DetailRow label="Horario laboral" value={person.workingHours} />
        <DetailRow label="Relación comercial" value={person.commercialRelation} />
        <DetailRow label="Ciudad" value={person.city} />
        <DetailRow label="Local asociado" value={person.linkedEntity} />
      </DetailSection>

      <DetailSection title="Seguimiento">
        <DetailRow label="Responsable" value={person.owner} />
        <DetailRow label="Potencial" value={person.potential ? `${person.potential}/34` : 'Sin evaluar'} />
        <DetailRow label="?ltima actividad" value={formatDate(person.lastActivity)} />
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

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      />
    </label>
  );
}

function parseWorkSchedule(value: string) {
  const [shiftPart = '', hoursPart = ''] = value.split(' · ');
  const [start = '', end = ''] = hoursPart.split('-');
  return { shift: shiftPart, start, end };
}

function formatWorkSchedule(shift: string, start: string, end: string) {
  const hours = [start, end].filter(Boolean).join('-');
  return [shift, hours].filter(Boolean).join(' · ');
}

function EditWorkScheduleField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsed = parseWorkSchedule(value);

  function update(next: Partial<ReturnType<typeof parseWorkSchedule>>) {
    const shift = next.shift ?? parsed.shift;
    const start = next.start ?? parsed.start;
    const end = next.end ?? parsed.end;
    onChange(formatWorkSchedule(shift, start, end));
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
        Turno
        <select
          value={parsed.shift}
          onChange={(event) => update({ shift: event.target.value })}
          className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
        >
          <option value="">Sin turno</option>
          {workShiftOptions.map((shift) => (
            <option key={shift} value={shift}>
              {shift}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <EditField label="Hora inicio" value={parsed.start} onChange={(start) => update({ start })} type="time" />
        <EditField label="Hora fin" value={parsed.end} onChange={(end) => update({ end })} type="time" />
      </div>
    </div>
  );
}

function EditTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      />
    </label>
  );
}

function EditSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StaffContactStage;
  onChange: (value: StaffContactStage) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as StaffContactStage)}
        className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      >
        {stageOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RoleSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      Cargo
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      >
        <option value="">Sin cargo</option>
        {hospitalityRoles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </label>
  );
}

function clean(value: string) {
  return value.trim() || undefined;
}
