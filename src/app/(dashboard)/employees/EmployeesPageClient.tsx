'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffEmployee } from '@/lib/api';
import { useDashboard } from '../DashboardContext';

interface EmployeesPageClientProps {
  employees: StaffEmployee[];
}


function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function EmployeesPageClient({ employees }: EmployeesPageClientProps) {
  const router = useRouter();
  const { setSelectedClient, setSelectedEmployee } = useDashboard();
  const [query, setQuery] = useState('');

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return employees;

    return employees.filter((employee) =>
      [employee.employeeCode, employee.name, employee.role, employee.personalEmail || ''].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [employees, query]);


  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-ronda-text">Empleados</h1>
            <p className="mt-2 text-sm text-ronda-muted">
              Gestion interna de empleados y permisos del equipo de Ronda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/employees/new')}
            className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark shrink-0"
          >
            Nuevo empleado
          </button>
        </header>

        <div className="flex shrink-0 items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, codigo o rol..."
            className="min-h-10 w-full max-w-md rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
          />
          <p className="text-sm font-medium text-ronda-muted">
            {filteredEmployees.length} de {employees.length}
          </p>
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-ronda-surface outline outline-1 -outline-offset-1 outline-ronda-border">
          <div className="grid shrink-0 grid-cols-[9rem_1fr_1fr_9rem_8rem_9rem] gap-4 border-b border-ronda-border bg-ronda-surface-soft px-4 py-3 text-xs font-semibold uppercase text-ronda-muted">
            <span>Codigo</span>
            <span>Nombre</span>
            <span>Email</span>
            <span>Rol</span>
            <span>Estado</span>
            <span>Alta</span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {filteredEmployees.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ronda-muted">
                No hay empleados que coincidan con la busqueda.
              </div>
            ) : (
              <div className="divide-y divide-ronda-border">
                {filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={() => {
                      setSelectedClient(null);
                      setSelectedEmployee(employee);
                    }}
                    className="grid grid-cols-[9rem_1fr_1fr_9rem_8rem_9rem] items-center gap-4 px-4 py-4 text-sm cursor-pointer hover:bg-ronda-bg/40 transition"
                  >
                    <span className="font-semibold text-ronda-coffee">{employee.employeeCode}</span>
                    <span className="min-w-0 truncate font-medium text-ronda-text">{employee.name}</span>
                    <span className="min-w-0 truncate text-ronda-muted">{employee.personalEmail || '—'}</span>
                    <span className="text-ronda-muted">{employee.role}</span>
                    <span
                      className={`w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        employee.isActive
                          ? 'bg-ronda-success/10 text-ronda-success'
                          : 'bg-ronda-bg text-ronda-muted'
                      }`}
                    >
                      {employee.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="text-ronda-muted">{formatDate(employee.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

    </div>
  );
}
