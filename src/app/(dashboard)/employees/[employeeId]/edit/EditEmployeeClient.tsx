'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { StaffEmployee } from '@/lib/api';
import { updateStaffEmployee } from '@/lib/api';

const roleOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Administrador' },
  { value: 'superadmin', label: 'Superadministrador' },
];

interface EditEmployeeClientProps {
  employee: StaffEmployee;
}

export function EditEmployeeClient({ employee }: EditEmployeeClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: employee.name,
    personalEmail: employee.personalEmail ?? '',
    role: employee.role,
    isActive: employee.isActive,
    iban: employee.iban ?? '',
    bankHolder: employee.bankHolder ?? '',
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      await updateStaffEmployee(employee.id, {
        name: form.name.trim(),
        personalEmail: form.personalEmail.trim() || undefined,
        role: form.role,
        isActive: form.isActive,
        iban: form.iban.trim() || undefined,
        bankHolder: form.bankHolder.trim() || undefined,
      });
      router.push(`/employees/${employee.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/employees/${employee.id}`)}
            className="rounded-lg border border-ronda-border p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text"
            title="Volver"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-ronda-text">Editar empleado</h1>
            <p className="mt-1 font-mono text-sm text-ronda-muted">{employee.employeeCode} · {employee.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => router.push(`/employees/${employee.id}`)}
            disabled={saving}
            className="min-h-10 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-text transition hover:bg-ronda-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="edit-employee-form"
            disabled={saving}
            className="min-h-10 rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </header>

      <form
        id="edit-employee-form"
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-ronda-border bg-ronda-surface"
      >
        <div className="space-y-6 p-6">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">
              Nombre completo *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
              required
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">
              Email personal
            </label>
            <input
              type="email"
              value={form.personalEmail}
              onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
              placeholder="juan@gmail.com"
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
              disabled={saving}
            />
            <p className="mt-1.5 text-xs text-ronda-muted/70">
              Para notificaciones importantes. No se usa para iniciar sesión.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">
              Rol *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition focus:border-ronda-gold"
              disabled={saving}
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-ronda-border pt-6">
            <label className="flex items-center gap-2 text-sm font-medium text-ronda-text">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-ronda-gold"
                disabled={saving}
              />
              Empleado activo
            </label>
            <p className="mt-1.5 ml-6 text-xs text-ronda-muted/70">
              Los empleados inactivos no pueden iniciar sesión.
            </p>
          </div>

          <div className="border-t border-ronda-border pt-6 space-y-4">
            <p className="text-xs font-semibold uppercase text-ronda-muted">Datos bancarios</p>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">IBAN</label>
              <input
                type="text"
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="ES00 0000 0000 0000 0000 0000"
                className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 font-mono text-sm text-ronda-text outline-none transition placeholder:font-sans placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                disabled={saving}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">Titular de la cuenta</label>
              <input
                type="text"
                value={form.bankHolder}
                onChange={(e) => setForm({ ...form, bankHolder: e.target.value })}
                placeholder="Juan García López"
                className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                disabled={saving}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-ronda-error">{error}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
