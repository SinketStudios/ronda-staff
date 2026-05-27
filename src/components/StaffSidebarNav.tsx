'use client';

import { usePathname } from 'next/navigation';
import { useDashboard } from '@/app/(dashboard)/DashboardContext';

const baseNavItems = [
  { href: '/dashboard', label: 'Panel' },
  { href: '/clients', label: 'Clientes' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/incidents', label: 'Incidencias' },
  { href: '/employees', label: 'Empleados' },
  { href: '/templates', label: 'Plantillas' },
];

export function StaffSidebarNav() {
  const pathname = usePathname();
  const { staff } = useDashboard();

  const navItems = [
    ...baseNavItems,
    ...(staff?.role === 'superadmin' ? [{ href: '/logs', label: 'Logs' }] : []),
  ];

  return (
    <nav className="flex-1 space-y-1 px-4 py-5">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition ${
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
