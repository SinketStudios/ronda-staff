'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffAutomation, type AutomationStatus, type StaffAutomationWorkflow } from '@/lib/api';

const statusCopy: Record<AutomationStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'border-ronda-border bg-ronda-bg text-ronda-muted' },
  active: { label: 'Activa', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  paused: { label: 'Pausada', className: 'border-amber-200 bg-amber-50 text-amber-800' },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

type AutomationsPageClientProps = {
  initialAutomations: StaffAutomationWorkflow[];
};

export function AutomationsPageClient({ initialAutomations }: AutomationsPageClientProps) {
  const router = useRouter();
  const [automations, setAutomations] = useState<StaffAutomationWorkflow[]>(initialAutomations);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredAutomations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return automations;
    return automations.filter((automation) =>
      `${automation.name} ${automation.description ?? ''} ${automation.restaurant?.name ?? ''}`.toLowerCase().includes(normalizedQuery),
    );
  }, [automations, query]);

  async function createAutomation() {
    setIsCreating(true);
    setError(null);

    try {
      const automation = await createStaffAutomation({
        name: `Nueva automatizacion ${automations.length + 1}`,
        description: 'Workflow sin configurar.',
        status: 'draft',
        nodes: [],
        edges: {},
      });
      setAutomations((current) => [automation, ...current]);
      router.push(`/automations/${automation.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear la automatizacion');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
      <header className="grid shrink-0 gap-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ronda-gold-dark">Workflows internos</p>
          <h1 className="mt-2 text-2xl font-semibold text-ronda-text sm:text-3xl">Automatizaciones</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ronda-muted">
            Gestiona procesos visuales para tareas como digitalizar cartas, revisar datos o ejecutar acciones de soporte.
          </p>
        </div>
        <button
          type="button"
          onClick={createAutomation}
          disabled={isCreating}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-ronda-coffee px-5 text-sm font-semibold text-white transition hover:bg-ronda-logo active:scale-[0.98]"
        >
          {isCreating ? 'Creando...' : 'Crear automatizacion'}
        </button>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      ) : null}

      <section className="grid shrink-0 grid-cols-1 overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface sm:grid-cols-3">
        <div className="px-4 py-3">
          <p className="text-2xl font-semibold text-ronda-coffee">{automations.length}</p>
          <p className="text-xs font-semibold uppercase text-ronda-muted">Automatizaciones</p>
        </div>
        <div className="border-t border-ronda-border px-4 py-3 sm:border-l sm:border-t-0">
          <p className="text-2xl font-semibold text-ronda-success">{automations.filter((item) => item.status === 'active').length}</p>
          <p className="text-xs font-semibold uppercase text-ronda-muted">Activas</p>
        </div>
        <div className="border-t border-ronda-border px-4 py-3 sm:border-l sm:border-t-0">
          <p className="text-2xl font-semibold text-ronda-gold-dark">{automations.reduce((total, item) => total + item.runs, 0)}</p>
          <p className="text-xs font-semibold uppercase text-ronda-muted">Ejecuciones</p>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface">
        <div className="grid shrink-0 gap-3 border-b border-ronda-border bg-ronda-surface-soft px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-ronda-text">Lista de automatizaciones</h2>
            <p className="mt-1 text-xs text-ronda-muted">Aqui apareceran los workflows creados para el equipo interno.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar automatizacion"
            className="min-h-10 rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm text-ronda-text outline-none transition focus:border-ronda-gold sm:w-72"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {filteredAutomations.length > 0 ? (
            <div className="divide-y divide-ronda-border">
              {filteredAutomations.map((automation) => {
                const status = statusCopy[automation.status];
                return (
                  <button
                    key={automation.id}
                    type="button"
                    onClick={() => router.push(`/automations/${automation.id}`)}
                    className="grid w-full gap-3 px-4 py-4 text-left transition hover:bg-ronda-bg/70 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_9rem] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ronda-text">{automation.name}</span>
                      <span className="mt-1 block truncate text-sm text-ronda-muted">{automation.description}</span>
                      <span className="mt-2 inline-flex rounded-md bg-ronda-bg px-2 py-1 text-xs font-semibold text-ronda-muted sm:hidden">
                        {automation.restaurant?.name ?? 'Manual'}
                      </span>
                    </span>
                    <span className="hidden text-sm font-semibold text-ronda-muted sm:block">{automation.restaurant?.name ?? 'Manual'}</span>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                    <span className="text-sm font-medium text-ronda-muted sm:text-right">{formatDate(automation.updatedAt)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-full place-items-center px-6 py-14 text-center">
              <div className="max-w-md">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg border border-ronda-border bg-ronda-bg text-xl font-semibold text-ronda-coffee">
                  +
                </div>
                <h2 className="mt-4 text-xl font-semibold text-ronda-text">Todavia no hay automatizaciones</h2>
                <p className="mt-2 text-sm leading-6 text-ronda-muted">
                  Crea la primera para empezar a definir nodos, prompts y ejecuciones en segundo plano.
                </p>
                <button
                  type="button"
                  onClick={createAutomation}
                  disabled={isCreating}
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-ronda-coffee px-5 text-sm font-semibold text-white transition hover:bg-ronda-logo active:scale-[0.98]"
                >
                  {isCreating ? 'Creando...' : 'Crear automatizacion'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
