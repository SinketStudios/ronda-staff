'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { StaffEmployee } from '@/lib/api';
import { sendEmployeeTestEmail } from '@/lib/api';

const roleColors: Record<string, string> = {
  staff: 'bg-ronda-muted/10 text-ronda-muted',
  admin: 'bg-ronda-gold/10 text-ronda-gold-dark',
  superadmin: 'bg-ronda-success/10 text-ronda-success',
};

const roleLabels: Record<string, string> = {
  staff: 'Staff',
  admin: 'Administrador',
  superadmin: 'Superadministrador',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface EmployeeDetailPageProps {
  employee: StaffEmployee;
}

export function EmployeeDetailPage({ employee }: EmployeeDetailPageProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function handleSendEmail() {
    setSending(true);
    setEmailStatus('idle');
    try {
      await sendEmployeeTestEmail(employee.id);
      setEmailStatus('sent');
    } catch {
      setEmailStatus('error');
    } finally {
      setSending(false);
    }
  }

  const roleLabel = roleLabels[employee.role] ?? employee.role;
  const roleColor = roleColors[employee.role] ?? 'bg-ronda-bg text-ronda-muted';

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-ronda-border p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            title="Volver"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-ronda-text">{employee.name}</h1>
            <p className="mt-1 font-mono text-sm text-ronda-muted">{employee.employeeCode}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {employee.personalEmail && (
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sending}
              className="min-h-10 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-text transition hover:bg-ronda-bg disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar correo de prueba'}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/employees/${employee.id}/edit`)}
            className="min-h-10 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-text transition hover:bg-ronda-bg"
          >
            Editar
          </button>
        </div>
      </header>

      {emailStatus === 'sent' && (
        <div className="shrink-0 rounded-lg border border-ronda-success/30 bg-ronda-success/10 px-4 py-3">
          <p className="text-sm font-medium text-ronda-success">Correo enviado a {employee.personalEmail}</p>
        </div>
      )}
      {emailStatus === 'error' && (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-ronda-error">No se pudo enviar el correo. Revisa la configuración SMTP.</p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-ronda-surface p-6 outline outline-1 -outline-offset-1 outline-ronda-border">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-4">

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ronda-text">Información</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">Nombre</p>
                <p className="text-sm font-medium text-ronda-text">{employee.name}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">Código de empleado</p>
                <p className="font-mono text-sm font-semibold text-ronda-coffee">{employee.employeeCode}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">LDAP</p>
                <p className="break-all font-mono text-sm text-ronda-muted">{employee.employeeCode}@ronda.internal</p>
              </div>
              <div className="border-t border-ronda-border pt-4">
                <p className="mb-1 text-xs uppercase text-ronda-muted">Alta</p>
                <p className="text-sm text-ronda-text">{formatDate(employee.createdAt)}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ronda-text">Contacto</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">Email de invitación</p>
                <p className="break-all text-sm text-ronda-text">{employee.email || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">Email personal</p>
                <p className="break-all text-sm text-ronda-text">{employee.personalEmail || '—'}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ronda-text">Datos bancarios</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">IBAN</p>
                <p className="font-mono text-sm text-ronda-text">{employee.iban || '—'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-ronda-muted">Titular</p>
                <p className="text-sm text-ronda-text">{employee.bankHolder || '—'}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-ronda-text">Acceso</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase text-ronda-muted">Rol</p>
                <span className={`inline-flex rounded-lg px-3 py-2 text-xs font-semibold ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase text-ronda-muted">Estado</p>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${employee.isActive ? 'bg-ronda-success' : 'bg-ronda-muted'}`} />
                  <span className="text-sm font-medium text-ronda-text">
                    {employee.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
