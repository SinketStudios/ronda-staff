'use client';

import { Logo } from '@/components/Logo';
import {
  createStaffContact,
  getStaffContacts,
  type CreateStaffCommercialContactInput,
  type StaffCommercialContact,
} from '@/lib/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ContactStage = 'lead' | 'visited' | 'conversation' | 'meeting' | 'proposal' | 'closed';
type ContactTab = 'entities' | 'people';

type ContactItem = StaffCommercialContact;

type PersonItem = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  city: string;
  linkedEntity: string | null;
  stage: ContactStage;
  potential: number;
  owner: string;
  lastActivity: string | null;
  createdAt: string;
};

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

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type AddressPrediction = {
  placeId: string;
  label: string;
  secondaryLabel: string;
};

type LocationDraft = {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  manual: boolean;
};

type EvaluationQuestion = {
  id: string;
  title: string;
  options: Array<{ label: string; points: number }>;
};

const evaluationQuestions: EvaluationQuestion[] = [
  {
    id: 'tables',
    title: 'Número de mesas',
    options: [
      { label: 'Menos de 10 mesas', points: 0 },
      { label: 'Entre 10 y 20 mesas', points: 2 },
      { label: 'Más de 20 mesas', points: 3 },
    ],
  },
  {
    id: 'terrace',
    title: 'Terraza',
    options: [
      { label: 'Sin terraza', points: 0 },
      { label: 'Con terraza', points: 2 },
    ],
  },
  {
    id: 'employees',
    title: 'Empleados por turno',
    options: [
      { label: 'Menos de 3 empleados por turno', points: 0 },
      { label: 'Entre 3 y 5 empleados por turno', points: 2 },
      { label: 'Más de 5 empleados por turno', points: 3 },
    ],
  },
  {
    id: 'orderWaits',
    title: 'Esperas para pedir',
    options: [
      { label: 'No existen esperas para pedir', points: 0 },
      { label: 'Existen ocasionalmente', points: 2 },
      { label: 'Son frecuentes', points: 4 },
    ],
  },
  {
    id: 'paymentWaits',
    title: 'Esperas para pagar',
    options: [
      { label: 'No existen esperas para pagar', points: 0 },
      { label: 'Existen ocasionalmente', points: 2 },
      { label: 'Son frecuentes', points: 4 },
    ],
  },
  {
    id: 'hiring',
    title: 'Contratación de personal',
    options: [
      { label: 'No tiene problemas para contratar', points: 0 },
      { label: 'Tiene dificultades para contratar', points: 3 },
    ],
  },
  {
    id: 'orderErrors',
    title: 'Errores en comandas',
    options: [
      { label: 'No existen errores en comandas', points: 0 },
      { label: 'Existen errores ocasionales', points: 2 },
      { label: 'Son frecuentes', points: 3 },
    ],
  },
  {
    id: 'problemAwareness',
    title: 'Percepción de problemas operativos',
    options: [
      { label: 'No percibe problemas operativos', points: 0 },
      { label: 'Reconoce varios problemas operativos', points: 4 },
    ],
  },
  {
    id: 'ownerMindset',
    title: 'Mentalidad del propietario',
    options: [
      { label: 'Rechaza cualquier cambio', points: 0 },
      { label: 'Escucha propuestas', points: 2 },
      { label: 'Busca activamente mejorar el negocio', points: 4 },
    ],
  },
  {
    id: 'similarSolutions',
    title: 'Soluciones similares',
    options: [
      { label: 'Nunca ha valorado soluciones similares', points: 0 },
      { label: 'Ha valorado o probado soluciones similares', points: 3 },
    ],
  },
  {
    id: 'multipleLocations',
    title: 'Número de locales',
    options: [
      { label: 'Un único local', points: 0 },
      { label: 'Dos o más locales', points: 3 },
    ],
  },
  {
    id: 'expansionPlans',
    title: 'Expansión',
    options: [
      { label: 'Sin planes de expansión conocidos', points: 0 },
      { label: 'Planes de expansión o nuevas aperturas', points: 2 },
    ],
  },
];

const evaluationCategories = [
  { title: 'Tamaño del negocio', questionIds: ['tables', 'terrace', 'employees'] },
  { title: 'Operativa', questionIds: ['orderWaits', 'paymentWaits'] },
  { title: 'Dolor del negocio', questionIds: ['hiring', 'orderErrors', 'problemAwareness'] },
  { title: 'Mentalidad del propietario', questionIds: ['ownerMindset', 'similarSolutions'] },
  { title: 'Estructura del negocio', questionIds: ['multipleLocations', 'expansionPlans'] },
];

const stageData: Record<ContactStage, { label: string; className: string }> = {
  lead: { label: 'Contacto', className: 'bg-slate-100 text-slate-700' },
  visited: { label: 'Visitado', className: 'bg-ronda-bg text-ronda-muted' },
  conversation: { label: 'Conversación', className: 'bg-blue-50 text-blue-700' },
  meeting: { label: 'Reunión', className: 'bg-violet-50 text-violet-700' },
  proposal: { label: 'Propuesta', className: 'bg-ronda-gold/10 text-ronda-gold-dark' },
  closed: { label: 'Cerrado', className: 'bg-ronda-success/10 text-ronda-success' },
};

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function ContactsPageClient() {
  const [activeTab, setActiveTab] = useState<ContactTab>('entities');
  const [createLocalOpen, setCreateLocalOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ContactStage | 'all'>('all');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleStage, setPeopleStage] = useState<ContactStage | 'all'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [peoplePageSize, setPeoplePageSize] = useState(10);
  const [peoplePage, setPeoplePage] = useState(1);

  const loadContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    setContactsError(null);
    try {
      setContacts(await getStaffContacts());
    } catch (error) {
      setContactsError(error instanceof Error ? error.message : 'No se pudieron cargar los contactos');
    } finally {
      setIsLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const people = useMemo<PersonItem[]>(() => {
    return contacts.flatMap((contact) =>
      contact.people.map((person) => ({
        id: person.id,
        name: person.name,
        role: person.role ?? '',
        phone: person.phone ?? '',
        email: person.email ?? '',
        city: contact.city,
        linkedEntity: contact.restaurantName,
        stage: contact.stage,
        potential: contact.potential,
        owner: contact.owner,
        lastActivity: contact.lastActivity,
        createdAt: person.createdAt,
      })),
    );
  }, [contacts]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return contacts.filter((contact) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          contact.restaurantName,
          contact.contactName,
          contact.phone,
          contact.email,
          contact.address,
          contact.city,
          contact.owner,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesQuery && (stage === 'all' || contact.stage === stage);
    });
  }, [query, stage]);

  const filteredPeople = useMemo(() => {
    const normalizedQuery = peopleQuery.trim().toLowerCase();

    return people.filter((person) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          person.name,
          person.role,
          person.phone,
          person.email,
          person.city,
          person.linkedEntity ?? '',
          person.owner,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesQuery && (peopleStage === 'all' || person.stage === peopleStage);
    });
  }, [peopleQuery, peopleStage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const peopleTotalPages = Math.max(1, Math.ceil(filteredPeople.length / peoplePageSize));
  const peopleCurrentPage = Math.min(peoplePage, peopleTotalPages);
  const peoplePageItems = filteredPeople.slice((peopleCurrentPage - 1) * peoplePageSize, peopleCurrentPage * peoplePageSize);

  function updateFilter(action: () => void) {
    action();
    setPage(1);
  }

  function updatePeopleFilter(action: () => void) {
    action();
    setPeoplePage(1);
  }

  return (
    <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
      <header className="shrink-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ronda-text sm:text-3xl">Contactos</h1>
          <p className="mt-2 text-sm text-ronda-muted">Prospectos comerciales registrados por el equipo.</p>
        </div>
      </header>

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-ronda-border bg-ronda-surface p-1 shadow-sm">
        {[
          { id: 'entities' as const, label: 'Locales', count: contacts.length },
          { id: 'people' as const, label: 'Personas', count: people.length },
        ].map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
                active
                  ? 'bg-ronda-coffee text-white shadow-sm'
                  : 'text-ronda-muted hover:bg-ronda-bg hover:text-ronda-coffee'
              }`}
            >
              {tab.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/15 text-white' : 'bg-ronda-bg text-ronda-muted'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
        </div>
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'entities') setCreateLocalOpen(true);
          }}
          className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark sm:shrink-0"
        >
          {activeTab === 'entities' ? 'Añadir local' : 'Añadir persona'}
        </button>
      </div>

      {contactsError ? (
        <div className="shrink-0 rounded-lg border border-ronda-error/30 bg-red-50 px-4 py-3 text-sm font-medium text-ronda-error">
          {contactsError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-hidden">
        {activeTab === 'entities' ? (
          <>
        <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase text-ronda-muted lg:min-w-72 lg:flex-1">
            Buscar
            <input
              value={query}
              onChange={(event) => updateFilter(() => setQuery(event.target.value))}
            placeholder="Restaurante, contacto, teléfono, ciudad..."
              className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
            Estado comercial
            <select
              value={stage}
              onChange={(event) => updateFilter(() => setStage(event.target.value as ContactStage | 'all'))}
              className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
            >
              <option value="all">Todos</option>
              <option value="lead">Contacto</option>
              <option value="visited">Visitado</option>
              <option value="conversation">Conversación</option>
              <option value="meeting">Reunión</option>
              <option value="proposal">Propuesta</option>
              <option value="closed">Cerrado</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
            Mostrar
            <select
              value={pageSize}
              onChange={(event) => updateFilter(() => setPageSize(Number(event.target.value)))}
              className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        <section className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface lg:flex">
          <div className="grid shrink-0 grid-cols-[1.1fr_1fr_1.1fr_0.8fr_0.8fr_0.8fr] gap-4 border-b border-ronda-border bg-ronda-surface-soft px-4 py-3 text-xs font-semibold uppercase text-ronda-muted">
            <span>Local</span>
            <span>Contacto</span>
            <span>Ubicación</span>
            <span>Estado</span>
            <span>Potencial</span>
            <span>Actividad</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoadingContacts ? (
              <div className="grid h-full min-h-80 place-items-center px-4 py-10 text-center text-sm text-ronda-muted">
                Cargando contactos...
              </div>
            ) : pageItems.length === 0 ? (
              <div className="grid h-full min-h-80 place-items-center px-4 py-10 text-center">
                <div className="max-w-md">
                  <p className="text-base font-semibold text-ronda-text">Todavía no hay contactos</p>
                  <p className="mt-2 text-sm text-ronda-muted">
                    Aquí irán los locales prospectados por los comerciales, separados de los clientes reales.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-ronda-border">
                {pageItems.map((contact) => (
                  <div
                    key={contact.id}
                    className="grid grid-cols-[1.1fr_1fr_1.1fr_0.8fr_0.8fr_0.8fr] items-center gap-4 px-4 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ronda-text">{contact.restaurantName}</p>
                      <p className="truncate text-xs text-ronda-muted">Responsable: {contact.owner}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ronda-text">{contact.contactName || 'Sin contacto'}</p>
                      <p className="truncate text-xs text-ronda-muted">{contact.phone || contact.email || 'Sin datos'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ronda-text">{contact.address || 'Sin dirección'}</p>
                      <p className="truncate text-xs text-ronda-muted">{contact.city || 'Sin ciudad'}</p>
                    </div>
                    <span className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${stageData[contact.stage].className}`}>
                      {stageData[contact.stage].label}
                    </span>
                    <p className="font-semibold text-ronda-coffee">
                      {contact.evaluation ? `${contact.evaluation.score}/${contact.evaluation.maxScore ?? 34}` : 'Sin evaluar'}
                    </p>
                    <p className="truncate text-xs font-medium text-ronda-muted">{formatDate(contact.lastActivity)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3 lg:hidden">
          {isLoadingContacts ? (
            <div className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-10 text-center text-sm text-ronda-muted">
              Cargando contactos...
            </div>
          ) : pageItems.length === 0 ? (
            <div className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-10 text-center text-sm text-ronda-muted">
              Todavía no hay contactos.
            </div>
          ) : (
            pageItems.map((contact) => (
              <div key={contact.id} className="rounded-lg border border-ronda-border bg-ronda-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ronda-text">{contact.restaurantName}</p>
                    <p className="mt-1 truncate text-xs text-ronda-muted">{contact.address || contact.city || 'Sin ubicación'}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${stageData[contact.stage].className}`}>
                    {stageData[contact.stage].label}
                  </span>
                </div>
                <p className="mt-3 truncate text-sm font-medium text-ronda-text">{contact.contactName || 'Sin contacto'}</p>
                <p className="mt-1 truncate text-xs text-ronda-muted">
                  {contact.phone || contact.email || 'Sin datos'} - Potencial {contact.evaluation ? `${contact.evaluation.score}/${contact.evaluation.maxScore ?? 34}` : 'sin evaluar'}
                </p>
              </div>
            ))
          )}
        </section>

        <div className="grid shrink-0 gap-3 text-sm text-ronda-muted sm:flex sm:items-center sm:justify-between sm:gap-4">
          <p>
            {filtered.length === 0 ? '0 contactos' : `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length}`}
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="min-h-9 rounded-lg border border-ronda-border bg-ronda-surface px-3 font-semibold text-ronda-coffee transition hover:bg-ronda-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="min-w-20 text-center font-semibold text-ronda-text">{currentPage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="min-h-9 rounded-lg border border-ronda-border bg-ronda-surface px-3 font-semibold text-ronda-coffee transition hover:bg-ronda-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
          </>
        ) : (
          <>
            <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <label className="grid min-w-0 gap-1.5 text-xs font-semibold uppercase text-ronda-muted lg:min-w-72 lg:flex-1">
                Buscar
                <input
                  value={peopleQuery}
                  onChange={(event) => updatePeopleFilter(() => setPeopleQuery(event.target.value))}
                  placeholder="Nombre, cargo, teléfono, email, ciudad..."
                  className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
                Estado comercial
                <select
                  value={peopleStage}
                  onChange={(event) => updatePeopleFilter(() => setPeopleStage(event.target.value as ContactStage | 'all'))}
                  className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
                >
                  <option value="all">Todos</option>
                  <option value="lead">Contacto</option>
                  <option value="visited">Visitado</option>
                  <option value="conversation">Conversación</option>
                  <option value="meeting">Reunión</option>
                  <option value="proposal">Propuesta</option>
                  <option value="closed">Cerrado</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
                Mostrar
                <select
                  value={peoplePageSize}
                  onChange={(event) => updatePeopleFilter(() => setPeoplePageSize(Number(event.target.value)))}
                  className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <section className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface lg:flex">
              <div className="grid shrink-0 grid-cols-[1.1fr_0.9fr_1fr_1fr_0.8fr_0.8fr] gap-4 border-b border-ronda-border bg-ronda-surface-soft px-4 py-3 text-xs font-semibold uppercase text-ronda-muted">
                <span>Persona</span>
                <span>Cargo</span>
                <span>Datos</span>
                <span>Local asociado</span>
                <span>Estado</span>
                <span>Potencial</span>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {peoplePageItems.length === 0 ? (
                  <div className="grid h-full min-h-80 place-items-center px-4 py-10 text-center">
                    <div className="max-w-md">
                      <p className="text-base font-semibold text-ronda-text">Todavía no hay personas</p>
                      <p className="mt-2 text-sm text-ronda-muted">
                        Aquí irán dueños, encargados o contactos comerciales, asociados o no a un local.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-ronda-border">
                    {peoplePageItems.map((person) => (
                      <div
                        key={person.id}
                        className="grid grid-cols-[1.1fr_0.9fr_1fr_1fr_0.8fr_0.8fr] items-center gap-4 px-4 py-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ronda-text">{person.name}</p>
                          <p className="truncate text-xs text-ronda-muted">Responsable: {person.owner}</p>
                        </div>
                        <p className="truncate font-medium text-ronda-text">{person.role || 'Sin cargo'}</p>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ronda-text">{person.phone || 'Sin teléfono'}</p>
                          <p className="truncate text-xs text-ronda-muted">{person.email || person.city || 'Sin datos'}</p>
                        </div>
                        <p className="truncate font-medium text-ronda-text">{person.linkedEntity || 'Sin local'}</p>
                        <span className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${stageData[person.stage].className}`}>
                          {stageData[person.stage].label}
                        </span>
                        <p className="font-semibold text-ronda-coffee">{person.potential ? `${person.potential}/34` : 'Sin evaluar'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-3 lg:hidden">
              {peoplePageItems.length === 0 ? (
                <div className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-10 text-center text-sm text-ronda-muted">
                  Todavía no hay personas.
                </div>
              ) : (
                peoplePageItems.map((person) => (
                  <div key={person.id} className="rounded-lg border border-ronda-border bg-ronda-surface p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ronda-text">{person.name}</p>
                        <p className="mt-1 truncate text-xs text-ronda-muted">{person.role || person.linkedEntity || 'Sin cargo'}</p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${stageData[person.stage].className}`}>
                        {stageData[person.stage].label}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-medium text-ronda-text">{person.phone || person.email || 'Sin datos'}</p>
                    <p className="mt-1 truncate text-xs text-ronda-muted">
                      {person.linkedEntity || 'Sin local'} - Potencial {person.potential ? `${person.potential}/34` : 'sin evaluar'}
                    </p>
                  </div>
                ))
              )}
            </section>

            <div className="grid shrink-0 gap-3 text-sm text-ronda-muted sm:flex sm:items-center sm:justify-between sm:gap-4">
              <p>
                {filteredPeople.length === 0 ? '0 personas' : `${(peopleCurrentPage - 1) * peoplePageSize + 1}-${Math.min(peopleCurrentPage * peoplePageSize, filteredPeople.length)} de ${filteredPeople.length}`}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setPeoplePage((value) => Math.max(1, value - 1))}
                  disabled={peopleCurrentPage === 1}
                  className="min-h-9 rounded-lg border border-ronda-border bg-ronda-surface px-3 font-semibold text-ronda-coffee transition hover:bg-ronda-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="min-w-20 text-center font-semibold text-ronda-text">{peopleCurrentPage} / {peopleTotalPages}</span>
                <button
                  type="button"
                  onClick={() => setPeoplePage((value) => Math.min(peopleTotalPages, value + 1))}
                  disabled={peopleCurrentPage === peopleTotalPages}
                  className="min-h-9 rounded-lg border border-ronda-border bg-ronda-surface px-3 font-semibold text-ronda-coffee transition hover:bg-ronda-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {createLocalOpen ? (
        <CreateLocalModal
          onCreated={(contact) => {
            setContacts((current) => [contact, ...current]);
            setCreateLocalOpen(false);
          }}
          onClose={() => setCreateLocalOpen(false)}
        />
      ) : null}
    </div>
  );
}

type LocalPersonDraft = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
};

type LocalFormDraft = {
  localName: string;
  venueType: string;
  phone: string;
  email: string;
  notes: string;
  web: string;
  instagram: string;
  tiktok: string;
  googleMapsUrl: string;
};

const emptyLocalForm: LocalFormDraft = {
  localName: '',
  venueType: '',
  phone: '',
  email: '',
  notes: '',
  web: '',
  instagram: '',
  tiktok: '',
  googleMapsUrl: '',
};

function CreateLocalModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (contact: ContactItem) => void;
}) {
  const [formDraft, setFormDraft] = useState<LocalFormDraft>(emptyLocalForm);
  const [peopleDrafts, setPeopleDrafts] = useState<LocalPersonDraft[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [evaluationOpen, setEvaluationOpen] = useState(false);
  const [evaluationAnswers, setEvaluationAnswers] = useState<Record<string, number>>({});
  const [locationDraft, setLocationDraft] = useState<LocationDraft>({
    address: '',
    city: '',
    province: '',
    postalCode: '',
    lat: null,
    lng: null,
    manual: false,
  });
  const updateLocationCoordinates = useCallback((lat: number, lng: number) => {
    setLocationDraft((current) => (current.lat === lat && current.lng === lng ? current : { ...current, lat, lng }));
  }, []);
  const markDirty = useCallback(() => setHasChanges(true), []);
  const updateManualMap = useCallback(async () => {
    const coordinates = await geocodeManualLocation(locationDraft);
    if (coordinates) updateLocationCoordinates(coordinates.lat, coordinates.lng);
  }, [locationDraft, updateLocationCoordinates]);

  function updatePerson(id: string, key: keyof Omit<LocalPersonDraft, 'id'>, value: string) {
    markDirty();
    setPeopleDrafts((current) => current.map((person) => (person.id === id ? { ...person, [key]: value } : person)));
  }

  function addPerson() {
    markDirty();
    setPeopleDrafts((current) => [...current, { id: crypto.randomUUID(), name: '', role: '', phone: '', email: '' }]);
  }

  function removePerson(id: string) {
    markDirty();
    setPeopleDrafts((current) => current.filter((person) => person.id !== id));
  }

  function updateForm<K extends keyof LocalFormDraft>(key: K, value: LocalFormDraft[K]) {
    markDirty();
    setFormDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveLocal() {
    setSaveError(null);
    if (!formDraft.localName.trim()) {
      setSaveError('El nombre del local es obligatorio.');
      return;
    }

    const evaluationResult = getEvaluationResult(evaluationAnswers);
    const clean = (value: string) => value.trim() || undefined;
    const input: CreateStaffCommercialContactInput = {
      localName: formDraft.localName,
      venueType: clean(formDraft.venueType),
      phone: clean(formDraft.phone),
      email: clean(formDraft.email),
      notes: clean(formDraft.notes),
      location: {
        address: clean(locationDraft.address),
        city: clean(locationDraft.city),
        province: clean(locationDraft.province),
        postalCode: clean(locationDraft.postalCode),
        lat: locationDraft.lat ?? undefined,
        lng: locationDraft.lng ?? undefined,
      },
      web: clean(formDraft.web),
      instagram: clean(formDraft.instagram),
      tiktok: clean(formDraft.tiktok),
      googleMapsUrl: clean(formDraft.googleMapsUrl),
      stage: evaluationResult.completed > 0 ? 'visited' : 'lead',
      people: peopleDrafts
        .filter((person) => person.name.trim())
        .map((person) => ({
          name: person.name,
          role: clean(person.role),
          phone: clean(person.phone),
          email: clean(person.email),
        })),
      evaluation: evaluationResult.completed > 0
        ? {
            answers: evaluationAnswers,
            score: evaluationResult.score,
            maxScore: evaluationResult.maxScore,
            percentage: evaluationResult.percentage,
            label: evaluationResult.result.label,
          }
        : undefined,
    };

    setIsSaving(true);
    try {
      onCreated(await createStaffContact(input));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el local');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ronda-coffee/45 p-0 backdrop-blur-sm sm:p-6 lg:p-8">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:rounded-xl sm:border sm:border-ronda-border">
        <div className="shrink-0 bg-white px-4 pb-5 pt-4 sm:px-6 sm:pt-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <Logo className="w-[96px] sm:w-[108px]" priority />
            <div className="flex gap-2 lg:order-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 flex-1 rounded-lg border border-ronda-border bg-white px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg sm:flex-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!hasChanges}
                onClick={saveLocal}
                className="min-h-10 flex-1 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
              >
                {isSaving ? 'Guardando...' : 'Guardar local'}
              </button>
            </div>
          </div>

          <div className="mx-auto mt-5 w-full max-w-7xl lg:mt-0 lg:pl-36 lg:pr-64">
            <h2 className="text-2xl font-semibold text-ronda-text">Nuevo local</h2>
            <p className="mt-1 text-sm text-ronda-muted">Registra un restaurante, bar o negocio potencial antes de convertirlo en cliente.</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-2 sm:px-6" onChange={markDirty}>
          <div className="mx-auto grid w-full max-w-7xl lg:pl-36 lg:pr-64">
            <LocalDetailsStep
              formDraft={formDraft}
              locationDraft={locationDraft}
              peopleDrafts={peopleDrafts}
              evaluationAnswers={evaluationAnswers}
              onAddPerson={addPerson}
              onRemovePerson={removePerson}
              onUpdatePerson={updatePerson}
              onUpdateForm={updateForm}
              onManualMap={updateManualMap}
              onStartEvaluation={() => setEvaluationOpen(true)}
              onLocationChange={(nextLocation) => {
                markDirty();
                setLocationDraft((current) => ({ ...current, ...nextLocation }));
              }}
            />
            {saveError ? (
              <div className="mb-6 rounded-lg border border-ronda-error/30 bg-red-50 px-4 py-3 text-sm font-medium text-ronda-error">
                {saveError}
              </div>
            ) : null}
          </div>
        </div>

        {evaluationOpen ? (
          <EvaluationModal
            answers={evaluationAnswers}
            onAnswer={(questionId, points) => {
              markDirty();
              setEvaluationAnswers((current) => ({ ...current, [questionId]: points }));
            }}
            onClose={() => setEvaluationOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="py-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-ronda-muted">{title}</span>
        <div className="h-px flex-1 bg-ronda-border" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function LocalDetailsStep({
  formDraft,
  locationDraft,
  peopleDrafts,
  evaluationAnswers,
  onAddPerson,
  onRemovePerson,
  onUpdatePerson,
  onUpdateForm,
  onManualMap,
  onStartEvaluation,
  onLocationChange,
}: {
  formDraft: LocalFormDraft;
  locationDraft: LocationDraft;
  peopleDrafts: LocalPersonDraft[];
  evaluationAnswers: Record<string, number>;
  onAddPerson: () => void;
  onRemovePerson: (id: string) => void;
  onUpdatePerson: (id: string, key: keyof Omit<LocalPersonDraft, 'id'>, value: string) => void;
  onUpdateForm: <K extends keyof LocalFormDraft>(key: K, value: LocalFormDraft[K]) => void;
  onManualMap: () => void;
  onStartEvaluation: () => void;
  onLocationChange: (location: Partial<LocationDraft>) => void;
}) {
  const evaluationResult = getEvaluationResult(evaluationAnswers);
  const hasEvaluation = evaluationResult.completed > 0;

  return (
    <>
      <FormSection title="Información básica" description="Datos principales para identificar el local.">
        <ControlledField label="Nombre del local" value={formDraft.localName} onChange={(value) => onUpdateForm('localName', value)} placeholder="Bar La Plaza" required />
        <ControlledField label="Tipo de local" value={formDraft.venueType} onChange={(value) => onUpdateForm('venueType', value)} placeholder="Restaurante, bar, cafetería..." />
        <ControlledField label="Teléfono del local" value={formDraft.phone} onChange={(value) => onUpdateForm('phone', value)} placeholder="+34 600 000 000" />
        <ControlledField label="Email general" value={formDraft.email} onChange={(value) => onUpdateForm('email', value)} placeholder="hola@local.com" type="email" />
        <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted md:col-span-2">
          Notas iniciales
          <textarea
            value={formDraft.notes}
            onChange={(event) => onUpdateForm('notes', event.target.value)}
            rows={4}
            placeholder="Contexto del primer registro, horario, observaciones del comercial..."
            className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
          />
        </label>
      </FormSection>

      <FormSection title="Localización" description="Ubicación física para poder verlo después en el mapa comercial.">
        <div className="grid gap-3 md:col-span-2 md:grid-cols-[1fr_auto] md:items-end">
          <AddressAutocomplete
            value={locationDraft.address}
            manual={locationDraft.manual}
            city={locationDraft.city}
            province={locationDraft.province}
            postalCode={locationDraft.postalCode}
            onManualSubmit={onManualMap}
            onChange={(address) => onLocationChange({ address })}
            onSelect={onLocationChange}
          />
          <button
            type="button"
            onClick={() => onLocationChange({ manual: !locationDraft.manual })}
            className="min-h-11 rounded-lg border border-ronda-border bg-white px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg"
          >
            {locationDraft.manual ? 'Usar predicción' : 'Poner manual'}
          </button>
        </div>

        {locationDraft.manual ? (
          <>
            <ControlledField label="Ciudad" value={locationDraft.city} onChange={(city) => onLocationChange({ city })} onBlur={onManualMap} placeholder="Barcelona" />
            <ControlledField label="Provincia" value={locationDraft.province} onChange={(province) => onLocationChange({ province })} onBlur={onManualMap} placeholder="Barcelona" />
            <ControlledField label="Código postal" value={locationDraft.postalCode} onChange={(postalCode) => onLocationChange({ postalCode })} onBlur={onManualMap} placeholder="08001" />
            <div />
          </>
        ) : null}

        <LocationMapPreview lat={locationDraft.lat} lng={locationDraft.lng} label={locationDraft.address} />
      </FormSection>

      <section className="py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-ronda-muted">Personal</span>
          <div className="h-px flex-1 bg-ronda-border" />
          <button
            type="button"
            onClick={onAddPerson}
            className="min-h-9 shrink-0 rounded-lg border border-ronda-border bg-white px-3 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg"
          >
            Añadir persona
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {peopleDrafts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ronda-border bg-ronda-bg px-3 py-3 text-sm text-ronda-muted">
              Sin personas asociadas. Puedes guardar el local y anadir personas mas adelante.
            </p>
          ) : peopleDrafts.map((person, index) => (
            <div key={person.id} className="py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ronda-coffee text-sm font-semibold text-white">{index + 1}</span>
                  <p className="text-sm font-semibold text-ronda-text">Persona asociada</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePerson(person.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-ronda-muted transition hover:bg-ronda-bg"
                >
                  Quitar
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ControlledField label="Nombre" value={person.name} onChange={(value) => onUpdatePerson(person.id, 'name', value)} />
                <ControlledSelect label="Cargo" value={person.role} onChange={(value) => onUpdatePerson(person.id, 'role', value)} options={hospitalityRoles} />
                <ControlledField label="Teléfono" value={person.phone} onChange={(value) => onUpdatePerson(person.id, 'phone', value)} />
                <ControlledField label="Email" value={person.email} onChange={(value) => onUpdatePerson(person.id, 'email', value)} type="email" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <FormSection title="Redes" description="Canales públicos y presencia online del local.">
        <ControlledField label="Web" value={formDraft.web} onChange={(value) => onUpdateForm('web', value)} placeholder="https://..." />
        <ControlledField label="Instagram" value={formDraft.instagram} onChange={(value) => onUpdateForm('instagram', value)} placeholder="@local" />
        <ControlledField label="TikTok" value={formDraft.tiktok} onChange={(value) => onUpdateForm('tiktok', value)} placeholder="@local" />
        <ControlledField label="Google Maps" value={formDraft.googleMapsUrl} onChange={(value) => onUpdateForm('googleMapsUrl', value)} placeholder="URL de la ficha" />
      </FormSection>

      <section className="py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="shrink-0 text-sm font-semibold text-ronda-muted">Evaluación</span>
          <div className="h-px flex-1 bg-ronda-border" />
          <button
            type="button"
            onClick={onStartEvaluation}
            className="min-h-9 shrink-0 rounded-lg bg-ronda-gold px-3 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark"
          >
            Empezar evaluación
          </button>
        </div>

        {hasEvaluation ? (
          <div className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ronda-text">
                  {evaluationResult.score}/{evaluationResult.maxScore} puntos
                </p>
                <p className="mt-1 text-sm text-ronda-muted">
                  {evaluationResult.completed}/{evaluationQuestions.length} respuestas completadas.
                </p>
              </div>
              <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${evaluationResult.result.className}`}>
                {evaluationResult.result.label}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-ronda-coffee transition-all" style={{ width: `${evaluationResult.percentage}%` }} />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-ronda-border bg-ronda-bg px-3 py-3 text-sm text-ronda-muted">
            Todavía no hay evaluación. Evalúa el local para calcular su potencial comercial y priorizar el seguimiento del equipo.
          </p>
        )}
      </section>
    </>
  );
}

function EvaluationModal({
  answers,
  onAnswer,
  onClose,
}: {
  answers: Record<string, number>;
  onAnswer: (questionId: string, points: number) => void;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const firstUnansweredIndex = evaluationQuestions.findIndex((question) => answers[question.id] === undefined);
    return firstUnansweredIndex === -1 ? evaluationQuestions.length : firstUnansweredIndex;
  });
  const currentQuestion = evaluationQuestions[currentIndex];
  const isSummary = currentIndex >= evaluationQuestions.length;
  const progress = Math.round((Math.min(currentIndex, evaluationQuestions.length) / evaluationQuestions.length) * 100);
  const result = getEvaluationResult(answers);
  const scoreColor = getEvaluationScoreColor(result.score);
  const selectedPoints = currentQuestion ? answers[currentQuestion.id] : undefined;

  const currentCategory = currentQuestion
    ? evaluationCategories.find((category) => category.questionIds.includes(currentQuestion.id))?.title
    : null;

  function goToNext() {
    setCurrentIndex((value) => Math.min(evaluationQuestions.length, value + 1));
  }

  function goToPrevious() {
    setCurrentIndex((value) => Math.max(0, value - 1));
  }

  function selectOption(points: number) {
    if (!currentQuestion) return;
    onAnswer(currentQuestion.id, points);
    window.setTimeout(() => {
      setCurrentIndex((value) => Math.min(evaluationQuestions.length, value + 1));
    }, 160);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft') {
        goToPrevious();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        if (isSummary || selectedPoints !== undefined) goToNext();
        return;
      }

      const optionIndex = Number(event.key) - 1;
      if (!currentQuestion || !Number.isInteger(optionIndex)) return;
      const option = currentQuestion.options[optionIndex];
      if (option) selectOption(option.points);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, isSummary, onClose, selectedPoints]);

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-white">
      <header className="shrink-0 bg-white px-3 py-3 [scrollbar-gutter:stable] sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ronda-muted">Evaluación comercial</p>
            <h2 className="mt-1 text-lg font-semibold text-ronda-text sm:text-2xl">Evaluación del local</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-9 rounded-lg border border-ronda-border bg-white px-3 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg sm:min-h-10 sm:px-4"
            >
              Volver
            </button>
            {isSummary ? (
              <button
                type="button"
                onClick={onClose}
                className="min-h-9 rounded-lg bg-ronda-coffee px-3 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark sm:min-h-10 sm:px-4"
              >
                Guardar evaluacion
              </button>
            ) : null}
          </div>
        </div>
        <div className="mx-auto mt-3 h-1 w-full max-w-6xl overflow-hidden rounded-full bg-ronda-border sm:mt-4">
          <div className="h-full rounded-full bg-ronda-coffee transition-all duration-300" style={{ width: `${isSummary ? 100 : progress}%` }} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white px-2 py-4 [scrollbar-gutter:stable] sm:px-6 sm:py-8">
        <div className="mx-auto min-h-full w-full max-w-6xl">
          {isSummary ? (
            <div className="w-full">
              <div className="grid gap-5 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:pb-8">
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ronda-muted">Resultado</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ronda-text sm:mt-3 sm:text-3xl">Evaluación completada</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ronda-muted sm:mt-4">
                    {getEvaluationDescription(result.score)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-ronda-muted">
                    {result.completed}/{evaluationQuestions.length} respuestas completadas.
                  </p>
                </div>

                <div className="grid place-items-center gap-3 sm:justify-self-end">
                  <span
                    className="rounded-full px-3 py-1 text-sm font-semibold text-white"
                    style={{ backgroundColor: scoreColor }}
                  >
                    {result.result.label}
                  </span>
                  <div
                    className="relative grid h-32 w-32 place-items-center rounded-full text-center sm:h-40 sm:w-40"
                    style={{
                      color: scoreColor,
                      background: `conic-gradient(${scoreColor} ${result.percentage}%, var(--ronda-border) 0 100%)`,
                    }}
                  >
                    <div className="absolute inset-3 rounded-full bg-white sm:inset-4" />
                    <div className="relative z-10 grid h-[92px] w-[92px] place-items-center rounded-full bg-white shadow-[0_10px_30px_rgba(36,22,12,0.08)] sm:h-[112px] sm:w-[112px]">
                      <div>
                        <p className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: scoreColor }}>
                          {result.score}/{result.maxScore}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase text-ronda-muted">puntos</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ronda-muted">Resumen</p>
                    <h4 className="mt-1 text-lg font-semibold text-ronda-text sm:text-xl">Desglose de respuestas</h4>
                  </div>
                </div>

                <div className="mt-3 grid gap-1.5 sm:mt-4 sm:gap-2">
                  {evaluationQuestions.map((question) => {
                    const points = answers[question.id] ?? 0;
                    const maxPoints = Math.max(...question.options.map((option) => option.points));
                    const selectedOption = question.options.find((option) => option.points === points);
                    const questionProgress = maxPoints === 0 ? 0 : Math.round((points / maxPoints) * 100);

                    return (
                      <div key={question.id} className="grid gap-1.5 py-2 sm:gap-2 sm:py-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ronda-text">{question.title}</p>
                            <p className="mt-0.5 text-sm text-ronda-muted">
                              {selectedOption?.label ?? 'Sin respuesta'}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-ronda-coffee sm:pt-1">
                            {points > 0 ? `+${points}` : points} puntos
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-ronda-border/70">
                          <div className="h-full rounded-full bg-ronda-gold transition-all" style={{ width: `${questionProgress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(0)}
                  className="min-h-11 rounded-lg border border-ronda-border bg-white px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg"
                >
                  Revisar respuestas
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            <div className="flex min-h-full w-full flex-col justify-center gap-5 px-2 sm:mx-auto sm:max-w-4xl sm:px-0 sm:gap-8">
              <div>
                <p className="text-sm font-semibold text-ronda-muted">
                  {currentIndex + 1} / {evaluationQuestions.length}
                  {currentCategory ? ` - ${currentCategory}` : ''}
                </p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-ronda-text sm:mt-3 sm:text-5xl">
                  {currentQuestion.title}
                </h3>
              </div>

              <div className="grid gap-2 sm:gap-3">
                {currentQuestion.options.map((option, optionIndex) => {
                  const selected = selectedPoints === option.points;
                  const shortcut = optionIndex + 1;

                  return (
                    <button
                      key={`${currentQuestion.id}-${option.points}-${option.label}`}
                      type="button"
                      onClick={() => selectOption(option.points)}
                      className={`group flex min-h-14 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition sm:min-h-20 sm:gap-4 sm:rounded-xl sm:px-5 sm:py-3 ${
                        selected
                          ? 'border-ronda-coffee bg-ronda-coffee text-white shadow-[0_14px_34px_rgba(36,22,12,0.18)]'
                          : 'border-ronda-border bg-white text-ronda-text shadow-sm hover:border-ronda-gold hover:bg-white'
                      }`}
                    >
                        <span className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-xs font-semibold sm:h-8 sm:w-8 sm:rounded-lg sm:text-sm ${
                          selected ? 'border-white/40 bg-white/10 text-white' : 'border-ronda-border bg-ronda-bg text-ronda-muted group-hover:border-ronda-gold'
                        }`}>
                          {shortcut}
                        </span>
                        <span className="text-base font-semibold leading-6 sm:text-lg">{option.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="min-h-10 rounded-lg border border-ronda-border bg-white px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={goToNext}
                  disabled={selectedPoints === undefined}
                  className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function getEvaluationResult(answers: Record<string, number>) {
  const maxScore = evaluationQuestions.reduce((sum, question) => sum + Math.max(...question.options.map((option) => option.points)), 0);
  const score = evaluationQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
  const percentage = Math.round((score / maxScore) * 100);
  const completed = evaluationQuestions.filter((question) => answers[question.id] !== undefined).length;
  const result =
    score >= 23
      ? { label: 'Oportunidad excelente', className: 'bg-ronda-success/10 text-ronda-success' }
      : score >= 16
        ? { label: 'Alta prioridad', className: 'bg-ronda-success/10 text-ronda-success' }
        : score >= 9
          ? { label: 'Oportunidad interesante', className: 'bg-ronda-gold/10 text-ronda-gold-dark' }
          : { label: 'Baja prioridad', className: 'bg-ronda-bg text-ronda-muted' };

  return { completed, maxScore, percentage, result, score };
}

function getEvaluationScoreColor(score: number) {
  if (score >= 23) return '#3F7A56';
  if (score >= 16) return '#B9653B';
  if (score >= 9) return '#B98A41';
  return '#C8B27A';
}

function getEvaluationDescription(score: number) {
  if (score >= 23) {
    return 'El local encaja muy bien con Ronda: tiene volumen, dolor operativo y una mentalidad favorable al cambio. Deberia priorizarse para seguimiento comercial inmediato.';
  }

  if (score >= 16) {
    return 'El local tiene buena oportunidad comercial. Hay señales claras de necesidad y merece seguimiento activo para validar decisor, timing y capacidad de cierre.';
  }

  if (score >= 9) {
    return 'El local puede ser interesante, pero todavía faltan señales fuertes de urgencia o encaje. Conviene mantenerlo en seguimiento y completar contexto antes de priorizar.';
  }

  return 'El local tiene baja prioridad comercial por ahora. Puede registrarse como contacto, pero no debería consumir esfuerzo comercial alto salvo que cambie el contexto.';
}

function EvaluationPanel({
  answers,
  onAnswer,
}: {
  answers: Record<string, number>;
  onAnswer: (questionId: string, points: number) => void;
}) {
  const { completed, maxScore, percentage, result, score } = getEvaluationResult(answers);

  return (
    <section className="overflow-hidden rounded-2xl border border-ronda-border bg-ronda-bg shadow-[0_18px_40px_rgba(36,22,12,0.08)]">
      <div className="border-b border-ronda-border bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ronda-muted">Score comercial</p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-ronda-text">Evaluación</h3>
            <p className="mt-1 text-xs leading-5 text-ronda-muted">Valora si merece prioridad comercial antes de convertirlo en oportunidad.</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${result.className}`}>{result.label}</span>
        </div>

        <div className="mt-5 grid grid-cols-[auto_1fr] items-end gap-4">
          <div>
            <p className="text-4xl font-semibold tracking-tight text-ronda-coffee">{score}</p>
            <p className="text-xs font-semibold text-ronda-muted">de {maxScore} puntos</p>
          </div>
          <div className="pb-1">
            <div className="flex justify-between text-[11px] font-semibold uppercase text-ronda-muted">
              <span>{completed}/{evaluationQuestions.length}</span>
              <span>{percentage}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ronda-bg">
              <div className="h-full rounded-full bg-ronda-coffee transition-all" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-1 text-[10px] font-semibold text-ronda-muted">
          <span>0-8 baja</span>
          <span>9-15 media</span>
          <span>16-22 alta</span>
          <span>23+ top</span>
        </div>
      </div>

      <div className="max-h-none overflow-y-auto p-4 lg:max-h-[calc(100dvh-18rem)]">
        <div className="grid gap-5">
          {evaluationCategories.map((category) => {
            const questions = category.questionIds
              .map((questionId) => evaluationQuestions.find((question) => question.id === questionId))
              .filter((question): question is EvaluationQuestion => Boolean(question));
            const categoryScore = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
            const categoryMax = questions.reduce((sum, question) => sum + Math.max(...question.options.map((option) => option.points)), 0);
            const categoryPercentage = Math.round((categoryScore / categoryMax) * 100);

            return (
              <section key={category.title} className="rounded-xl border border-ronda-border bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ronda-text">{category.title}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ronda-bg">
                      <div className="h-full rounded-full bg-ronda-gold transition-all" style={{ width: `${categoryPercentage}%` }} />
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-ronda-bg px-2.5 py-1 text-xs font-semibold text-ronda-muted">
                    {categoryScore}/{categoryMax}
                  </span>
                </div>

                <div className="grid gap-3">
                  {questions.map((question) => (
                    <div key={question.id} className="grid gap-2">
                      <p className="text-xs font-semibold uppercase text-ronda-muted">{question.title}</p>
                      <div className="grid gap-1.5">
                        {question.options.map((option) => {
                          const selected = answers[question.id] === option.points;
                          return (
                            <button
                              key={`${question.id}-${option.points}-${option.label}`}
                              type="button"
                              onClick={() => onAnswer(question.id, option.points)}
                              className={`flex min-h-10 items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm transition ${
                                selected
                                  ? 'border-ronda-coffee bg-ronda-coffee text-white shadow-sm'
                                  : 'border-ronda-border bg-white text-ronda-text hover:bg-ronda-bg'
                              }`}
                            >
                              <span className="font-medium leading-5">{option.label}</span>
                              <span className={selected ? 'font-semibold text-white' : 'font-semibold text-ronda-muted'}>+{option.points}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EvaluationSummary({ answers, onOpen }: { answers: Record<string, number>; onOpen: () => void }) {
  const { completed, maxScore, percentage, result, score } = getEvaluationResult(answers);

  return (
    <div className="md:col-span-2 rounded-lg border border-ronda-border bg-ronda-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ronda-text">{score}/{maxScore} puntos</p>
          <p className="mt-1 text-xs text-ronda-muted">{completed}/{evaluationQuestions.length} respuestas completadas</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${result.className}`}>{result.label}</span>
          <button
            type="button"
            onClick={onOpen}
            className="min-h-9 rounded-lg border border-ronda-border bg-white px-3 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg"
          >
            Abrir evaluacion
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-ronda-coffee transition-all" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-3 text-xs text-ronda-muted">
        0-8 baja prioridad · 9-15 interesante · 16-22 alta prioridad · 23+ excelente
      </p>
    </div>
  );
}

function EvaluationStep({
  answers,
  onAnswer,
}: {
  answers: Record<string, number>;
  onAnswer: (questionId: string, points: number) => void;
}) {
  const { completed, maxScore, percentage, result, score } = getEvaluationResult(answers);

  return (
    <div className="grid gap-6 py-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-ronda-text">Evaluación</h3>
            <p className="mt-1 text-sm text-ronda-muted">Sistema de puntos basado en criterios comerciales reales del manual de Ronda.</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-ronda-border bg-ronda-bg p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ronda-text">{score}/{maxScore} puntos</p>
              <p className="mt-1 text-xs text-ronda-muted">{completed}/{evaluationQuestions.length} respuestas completadas</p>
            </div>
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${result.className}`}>{result.label}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-ronda-coffee transition-all" style={{ width: `${percentage}%` }} />
          </div>
          <p className="mt-3 text-xs text-ronda-muted">
            0-8 baja prioridad · 9-15 interesante · 16-22 alta prioridad · 23+ excelente
          </p>
        </div>
      </div>

      <div>
        <div className="grid gap-8">
          {evaluationCategories.map((category) => {
            const questions = category.questionIds
              .map((questionId) => evaluationQuestions.find((question) => question.id === questionId))
              .filter((question): question is EvaluationQuestion => Boolean(question));
            const categoryScore = questions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0);
            const categoryMax = questions.reduce((sum, question) => sum + Math.max(...question.options.map((option) => option.points)), 0);

            return (
              <section key={category.title}>
                <div className="mb-4 flex items-center gap-3">
                  <span className="shrink-0 text-sm font-semibold text-ronda-muted">{category.title}</span>
                  <div className="h-px flex-1 bg-ronda-border" />
                  <span className="shrink-0 rounded-lg bg-ronda-bg px-2.5 py-1 text-xs font-semibold text-ronda-muted">
                    {categoryScore}/{categoryMax}
                  </span>
                </div>

                <div className="grid gap-5">
                  {questions.map((question) => (
                    <div key={question.id} className="grid gap-2">
                      <p className="text-sm font-semibold text-ronda-text">{question.title}</p>
                      <div className="grid gap-2">
                        {question.options.map((option) => {
                          const selected = answers[question.id] === option.points;
                          return (
                            <button
                              key={`${question.id}-${option.points}-${option.label}`}
                              type="button"
                              onClick={() => onAnswer(question.id, option.points)}
                              className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm transition ${
                                selected
                                  ? 'border-ronda-coffee bg-ronda-coffee text-white'
                                  : 'border-ronda-border bg-white text-ronda-text hover:bg-ronda-bg'
                              }`}
                            >
                              <span className="font-medium">{option.label}</span>
                              <span className={selected ? 'font-semibold text-white' : 'font-semibold text-ronda-muted'}>{option.points}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

async function loadGooglePlaces() {
  if (!googleMapsApiKey || typeof window === 'undefined') return false;
  if (window.google?.maps?.places) return true;
  if (window.__rondaGoogleMapsPromise) return window.__rondaGoogleMapsPromise;

  window.__rondaGoogleMapsPromise = new Promise((resolve) => {
    const existingScript = document.getElementById('ronda-google-maps');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.google?.maps?.places)), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'ronda-google-maps';
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places&loading=async`;
    script.onload = () => resolve(Boolean(window.google?.maps?.places));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return window.__rondaGoogleMapsPromise;
}

async function getAddressPredictions(query: string): Promise<AddressPrediction[]> {
  const loaded = await loadGooglePlaces();
  if (!loaded || !window.google?.maps?.places) return [];

  const service = new window.google.maps.places.AutocompleteService();
  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'es' },
        types: ['address'],
      },
      (predictions: any[] | null, status: string) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }

        resolve(
          predictions.slice(0, 6).map((prediction) => ({
            placeId: prediction.place_id,
            label: prediction.structured_formatting?.main_text || prediction.description,
            secondaryLabel: prediction.structured_formatting?.secondary_text || prediction.description,
          })),
        );
      },
    );
  });
}

async function getAddressDetails(prediction: AddressPrediction): Promise<Partial<LocationDraft> | null> {
  const loaded = await loadGooglePlaces();
  if (!loaded || !window.google?.maps?.places) return null;

  const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve) => {
    placesService.getDetails(
      {
        placeId: prediction.placeId,
        fields: ['address_components', 'formatted_address', 'geometry'],
      },
      (place: any | null, status: string) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          resolve(null);
          return;
        }

        const components = Array.isArray(place.address_components) ? place.address_components : [];
        const getComponent = (type: string) => components.find((component: any) => component.types?.includes(type))?.long_name || '';
        resolve({
          address: place.formatted_address || `${prediction.label}, ${prediction.secondaryLabel}`,
          city: getComponent('locality') || getComponent('postal_town') || getComponent('administrative_area_level_3'),
          province: getComponent('administrative_area_level_2') || getComponent('administrative_area_level_1'),
          postalCode: getComponent('postal_code'),
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          manual: false,
        });
      },
    );
  });
}

async function geocodeManualLocation(location: LocationDraft) {
  const query = [location.address, location.postalCode, location.city, location.province, 'Spain'].filter(Boolean).join(', ');
  if (!location.address.trim()) return null;

  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'es',
    q: query,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return null;
  const results = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  const lat = Number(results[0]?.lat);
  const lng = Number(results[0]?.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function AddressAutocomplete({
  value,
  manual,
  city,
  province,
  postalCode,
  onManualSubmit,
  onChange,
  onSelect,
}: {
  value: string;
  manual: boolean;
  city: string;
  province: string;
  postalCode: string;
  onManualSubmit: () => void;
  onChange: (value: string) => void;
  onSelect: (location: Partial<LocationDraft>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (manual || value.trim().length < 3) {
      setPredictions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      getAddressPredictions(value)
        .then((nextPredictions) => {
          if (!cancelled) setPredictions(nextPredictions);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [manual, value]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  async function selectPrediction(prediction: AddressPrediction) {
    onChange(`${prediction.label}, ${prediction.secondaryLabel}`);
    setOpen(false);
    const details = await getAddressDetails(prediction);
    if (details) onSelect(details);
  }

  return (
    <div ref={containerRef} className="relative z-[1000] grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      Direccion
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          if (manual) onManualSubmit();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (manual) {
            onManualSubmit();
            return;
          }
          if (predictions.length === 0) return;
          void selectPrediction(predictions[0]);
        }}
        placeholder={manual ? 'Calle, número, local' : 'Busca una dirección'}
        className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      />
      {manual ? (
        <p className="text-xs font-medium normal-case text-ronda-muted">
          {city || province || postalCode ? [postalCode, city, province].filter(Boolean).join(', ') : 'Escribe la dirección y completa los campos manuales.'}
        </p>
      ) : null}
      {!manual && open && value.trim().length >= 3 ? (
        <div className="absolute top-full z-[1000] mt-1 w-full overflow-hidden rounded-xl border border-ronda-border bg-white shadow-lg">
          {loading ? <p className="px-3 py-3 text-sm font-medium normal-case text-ronda-muted">Buscando direcciones...</p> : null}
          {!loading && predictions.length === 0 ? <p className="px-3 py-3 text-sm font-medium normal-case text-ronda-muted">Sin sugerencias</p> : null}
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => void selectPrediction(prediction)}
              className="w-full px-3 py-2.5 text-left normal-case transition hover:bg-ronda-bg"
            >
              <span className="block truncate text-sm font-semibold text-ronda-text">{prediction.label}</span>
              <span className="mt-0.5 block truncate text-xs font-medium text-ronda-muted">{prediction.secondaryLabel}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LocationMapPreview({ lat, lng, label }: { lat: number | null; lng: number | null; label: string }) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').CircleMarker | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  useEffect(() => {
    let disposed = false;

    async function mountMap() {
      if (!mapNodeRef.current) return;

      const L = await import('leaflet');
      leafletRef.current = L;
      if (disposed || !mapNodeRef.current) return;

      const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : [40.4168, -3.7038];
      const map = L.map(mapNodeRef.current, {
        center,
        zoom: lat !== null && lng !== null ? 16 : 6,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
      }).addTo(map);

      markerRef.current = L.circleMarker(center, {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        fillColor: '#3a2618',
        fillOpacity: 1,
      }).addTo(map);

      window.setTimeout(() => map.invalidateSize(), 80);
    }

    void mountMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (lat === null || lng === null || !mapRef.current || !markerRef.current) return;
    const nextCenter: [number, number] = [lat, lng];
    markerRef.current.setLatLng(nextCenter);
    mapRef.current.setView(nextCenter, 16, { animate: true });
  }, [lat, lng]);

  return (
    <div className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted md:col-span-2">
      Mapa
      <div className="relative h-48 overflow-hidden rounded-lg border border-ronda-border bg-ronda-bg">
        <div ref={mapNodeRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold normal-case text-ronda-coffee shadow-sm">
          {lat !== null && lng !== null ? label || 'Ubicación seleccionada' : 'Vista previa de ubicación'}
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder, type = 'text', required }: { label: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        required={required}
        className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      />
    </label>
  );
}

function ControlledField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
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
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      />
    </label>
  );
}

function ControlledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    const timeout = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const filtered = normalizedSearch
    ? options.filter((option) => option.toLocaleLowerCase('es').includes(normalizedSearch))
    : options;

  function select(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-ronda-border bg-ronda-bg px-3 text-left text-sm font-medium normal-case outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
      >
        <span className={value ? 'truncate text-ronda-text' : 'truncate text-ronda-muted/60'}>
          {value || 'Selecciona un cargo'}
        </span>
        <span className="shrink-0 text-xs text-ronda-muted">v</span>
      </button>

      {open ? (
        <div className="absolute top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-ronda-border bg-white shadow-lg">
          <div className="p-2 pb-1">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (filtered.length > 0) select(filtered[0]);
              }}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm font-medium normal-case text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold"
            />
          </div>
          <div className="max-h-52 overflow-auto py-1">
            <button
              type="button"
              onClick={() => select('')}
              className={`w-full px-3 py-2.5 text-left text-sm normal-case transition hover:bg-ronda-bg ${
                value === '' ? 'font-semibold text-ronda-coffee' : 'text-ronda-muted'
              }`}
            >
              Sin cargo
            </button>
            {filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => select(option)}
                className={`w-full px-3 py-2.5 text-left text-sm normal-case transition hover:bg-ronda-bg ${
                  option === value ? 'font-semibold text-ronda-coffee' : 'text-ronda-text'
                }`}
              >
                {option === value ? <span className="mr-1.5">OK</span> : null}
                {option}
              </button>
            ))}
            {filtered.length === 0 ? <p className="px-3 py-3 text-sm normal-case text-ronda-muted">Sin opciones</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
