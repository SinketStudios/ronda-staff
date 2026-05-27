'use client';

import { useEffect, useState } from 'react';
import type { StaffEmployee } from '@/lib/api';
import { getStaffEmployee } from '@/lib/api';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

const roleLabels: Record<string, string> = {
  staff: 'Staff',
  admin: 'Administrador',
  superadmin: 'Superadministrador',
};

const roleColors: Record<string, string> = {
  staff: 'bg-ronda-muted/10 text-ronda-muted',
  admin: 'bg-ronda-gold/10 text-ronda-gold-dark',
  superadmin: 'bg-ronda-success/10 text-ronda-success',
};

interface EmployeeDetailSidebarProps {
  employee: StaffEmployee | null;
  onClose: () => void;
}

export function EmployeeDetailSidebar({ employee, onClose }: EmployeeDetailSidebarProps) {
  const [fullEmployee, setFullEmployee] = useState<StaffEmployee | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee?.id) {
      setFullEmployee(null);
      return;
    }

    setLoading(true);
    getStaffEmployee(employee.id)
      .then(setFullEmployee)
      .catch(() => setFullEmployee(employee))
      .finally(() => setLoading(false));
  }, [employee?.id]);

  const displayEmployee = fullEmployee || employee;

  if (!displayEmployee) return null;

  return (
    <aside className="w-full h-full flex flex-col border-l border-ronda-border bg-ronda-surface overflow-hidden rounded-lg">
      <div className="border-b border-ronda-border bg-ronda-surface/80 shrink-0">
        <div className="px-6 py-4 flex items-center justify-between gap-2 h-20">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ronda-text">{displayEmployee.name}</h2>
          <p className="mt-1 truncate text-xs font-semibold uppercase text-ronda-muted">{displayEmployee.employeeCode}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-auto flex-1">
        {/* Employee Info */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Información</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-ronda-muted/70">Nombre</p>
              <p className="text-sm font-semibold text-ronda-text">{displayEmployee.name}</p>
            </div>
            <div>
              <p className="text-xs text-ronda-muted/70">Código de empleado</p>
              <p className="text-sm font-mono text-ronda-coffee font-semibold">{displayEmployee.employeeCode}</p>
            </div>
          </div>
        </section>

        {/* Emails */}
        {(displayEmployee.email || displayEmployee.personalEmail) && (
          <section>
            <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Emails</h3>
            <div className="space-y-3">
              {displayEmployee.email && (
                <div>
                  <p className="text-xs text-ronda-muted/70">Email de invitación</p>
                  <p className="text-sm text-ronda-text break-all">{displayEmployee.email}</p>
                </div>
              )}
              {displayEmployee.personalEmail && (
                <div>
                  <p className="text-xs text-ronda-muted/70">Email personal</p>
                  <p className="text-sm text-ronda-text break-all">{displayEmployee.personalEmail}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Role */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Rol</h3>
          <span className={`inline-flex rounded-lg px-3 py-2 text-xs font-semibold ${roleColors[displayEmployee.role]}`}>
            {roleLabels[displayEmployee.role] || displayEmployee.role}
          </span>
        </section>

        {/* Status */}
        <section>
          <h3 className="text-xs font-semibold uppercase text-ronda-muted mb-3">Estado</h3>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${displayEmployee.isActive ? 'bg-ronda-success' : 'bg-ronda-muted'}`}
            />
            <span className="text-sm font-medium text-ronda-text">{displayEmployee.isActive ? 'Activo' : 'Inactivo'}</span>
          </div>
        </section>

        {/* Created At */}
        <section className="text-xs text-ronda-muted space-y-2 pt-4 border-t border-ronda-border">
          <div>
            <p className="text-ronda-muted/70">Creado el</p>
            <p className="font-medium text-ronda-text">{formatDate(displayEmployee.createdAt)}</p>
          </div>
        </section>
      </div>
    </aside>
  );
}
