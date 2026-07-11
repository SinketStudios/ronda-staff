import { getCurrentStaff } from '@/lib/auth';

const areas = [
  {
    href: '/clients',
    title: 'Clientes',
    description: 'Organizaciones, locales y estado operativo.',
    meta: 'CRM interno',
  },
  {
    href: '/sales-map',
    title: 'Mapa comercial',
    description: 'Zonas comerciales de España para seguimiento y expansión.',
    meta: 'Comerciales',
  },
  {
    href: '/library',
    title: 'Biblioteca',
    description: 'Recursos de producto, imagenes y material comercial.',
    meta: 'Activos',
  },
  {
    href: '/incidents',
    title: 'Incidencias',
    description: 'Seguimiento de soporte y tareas bloqueantes.',
    meta: 'Soporte',
  },
];

export default async function DashboardPage() {
  const staff = await getCurrentStaff();

  return (
    <div className="space-y-7">
      <section className="rounded-lg border border-ronda-border bg-ronda-surface p-6">
        <p className="text-xs font-semibold uppercase text-ronda-muted">Panel interno</p>
        <h1 className="mt-2 text-3xl font-semibold text-ronda-text">Hola, {staff?.name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ronda-muted">
          Acceso rapido a las herramientas internas de Ronda para soporte, clientes y operaciones.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {areas.map((area) => (
          <a
            key={area.href}
            href={area.href}
            className="rounded-lg border border-ronda-border bg-ronda-surface p-5 transition hover:border-ronda-gold hover:bg-ronda-surface-soft/40"
          >
            <p className="text-xs font-semibold uppercase text-ronda-gold-dark">{area.meta}</p>
            <h2 className="mt-3 text-xl font-semibold text-ronda-coffee">{area.title}</h2>
            <p className="mt-2 text-sm leading-6 text-ronda-muted">{area.description}</p>
          </a>
        ))}
      </section>

      <section className="rounded-lg border border-ronda-border bg-ronda-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ronda-text">Estado de trabajo</h2>
            <p className="mt-1 text-sm text-ronda-muted">Sin alertas internas registradas en esta version.</p>
          </div>
          <span className="rounded-lg bg-ronda-success/10 px-3 py-2 text-sm font-semibold text-ronda-success">
            Operativo
          </span>
        </div>
      </section>
    </div>
  );
}
