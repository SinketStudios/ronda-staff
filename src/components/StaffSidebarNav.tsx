'use client';

import { usePathname } from 'next/navigation';
import { useDashboard } from '@/app/(dashboard)/DashboardContext';

const baseNavItems = [
  { href: '/dashboard', label: 'Panel' },
  { href: '/clients', label: 'Clientes' },
  { href: '/contacts', label: 'Contactos' },
  { href: '/sales-map', label: 'Mapa comercial' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/incidents', label: 'Incidencias' },
  { href: '/employees', label: 'Empleados' },
  { href: '/templates', label: 'Plantillas' },
  { href: '/infrastructure', label: 'Infraestructura' },
  ...(process.env.NEXT_PUBLIC_ENABLE_STAFF_AUTOMATIONS === 'true'
    ? [{ href: '/automations', label: 'Automatizaciones' }]
    : []),
];

export function StaffSidebarNav({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const pathname = usePathname();
  const { staff } = useDashboard();

  const navItems = [
    ...baseNavItems,
    ...(staff?.role === 'superadmin' ? [{ href: '/logs', label: 'Logs' }] : []),
  ];

  return (
    <nav
      className={
        variant === 'mobile'
          ? 'flex overflow-x-auto px-0 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex-1 space-y-1 px-4 py-5'
      }
    >
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center text-sm font-semibold transition ${
              variant === 'mobile' ? 'mr-1.5 min-h-9 rounded-full px-3 first:ml-4 last:mr-4' : 'min-h-11 rounded-lg px-3'
            } ${
              active
                ? 'bg-ronda-coffee text-white shadow-sm'
                : 'text-ronda-muted hover:bg-ronda-bg hover:text-ronda-coffee'
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
