'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StaffEmployee } from '@/lib/api';
import { getStaffEmployee, resendEmployeeInvitation } from '@/lib/api';

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
  const router = useRouter();
  const [fullEmployee, setFullEmployee] = useState<StaffEmployee | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    let cancelled = false;

    if (!employee?.id) {
      window.setTimeout(() => {
        if (!cancelled) setFullEmployee(null);
      }, 0);
      setInviteStatus('idle');
      return;
    }

    setInviteStatus('idle');

    getStaffEmployee(employee.id)
      .then((nextEmployee) => {
        if (!cancelled) setFullEmployee(nextEmployee);
      })
      .catch(() => {
        if (!cancelled) setFullEmployee(employee);
      });

    return () => {
      cancelled = true;
    };
  }, [employee]);

  const displayEmployee = fullEmployee || employee;

  if (!displayEmployee) return null;

  async function handleResendInvite() {
    if (!displayEmployee?.id) return;
    setSendingInvite(true);
    setInviteStatus('idle');
    try {
      await resendEmployeeInvitation(displayEmployee.id);
      setInviteStatus('sent');
    } catch {
      setInviteStatus('error');
    } finally {
      setSendingInvite(false);
    }
  }

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
            type="button"
            onClick={() => {
              onClose();
              router.push(`/employees/${displayEmployee.id}`);
            }}
            className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            aria-label="Ver"
            title="Ver"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push(`/employees/${displayEmployee.id}/edit`);
            }}
            className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            aria-label="Editar"
            title="Editar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
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
            {displayEmployee.personalEmail && (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={sendingInvite}
                  className="min-h-10 w-full rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-text transition hover:bg-ronda-bg disabled:opacity-50"
                >
                  {sendingInvite ? 'Enviando...' : 'Reenviar invitacion'}
                </button>
                {inviteStatus === 'sent' && (
                  <p className="text-xs font-semibold text-ronda-success">Invitacion reenviada a {displayEmployee.personalEmail}</p>
                )}
                {inviteStatus === 'error' && (
                  <p className="text-xs font-semibold text-ronda-error">No se pudo reenviar la invitacion.</p>
                )}
              </div>
            )}
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
