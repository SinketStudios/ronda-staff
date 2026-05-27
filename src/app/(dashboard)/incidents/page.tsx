export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase text-ronda-muted">Soporte</p>
        <h1 className="mt-2 text-3xl font-semibold text-ronda-text">Incidencias</h1>
        <p className="mt-2 text-sm text-ronda-muted">Registro interno para seguimiento de bloqueos, bugs y tareas de soporte.</p>
      </header>

      <section className="rounded-lg border border-ronda-border bg-ronda-surface p-5">
        <div className="flex items-center justify-between border-b border-ronda-border pb-4">
          <h2 className="text-lg font-semibold text-ronda-coffee">Bandeja</h2>
          <span className="rounded-lg bg-ronda-bg px-3 py-1.5 text-sm font-semibold text-ronda-muted">0 abiertas</span>
        </div>
        <p className="py-10 text-center text-sm text-ronda-muted">No hay incidencias cargadas todavia.</p>
      </section>
    </div>
  );
}
