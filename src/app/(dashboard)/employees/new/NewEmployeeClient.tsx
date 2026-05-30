'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffEmployee } from '@/lib/api';

const roleOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' },
];

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

function generatePassword() {
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values).map((v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join('');
}

function generateEmployeeCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `500${String(values[0] % 100000).padStart(5, '0')}`;
}

export function NewEmployeeClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    personalEmail: '',
    employeeCode: '',
    role: 'staff',
    password: '',
    isActive: true,
    iban: '',
    bankHolder: '',
  });

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const result = await createStaffEmployee({
        employeeCode: form.employeeCode.trim(),
        name: form.name.trim(),
        personalEmail: form.personalEmail.trim(),
        role: form.role,
        password: form.password,
        isActive: form.isActive,
        iban: form.iban.trim() || undefined,
        bankHolder: form.bankHolder.trim() || undefined,
      });
      setSetupLink(result.setupLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el empleado');
      setSaving(false);
    }
  }

  if (setupLink !== null) {
    return (
      <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
        <header className="grid shrink-0 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-ronda-text sm:text-3xl">Empleado creado</h1>
            <p className="mt-2 text-sm text-ronda-muted">El empleado ha sido creado exitosamente.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/employees')}
            className="rounded-lg bg-ronda-coffee px-4 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark"
          >
            Volver a empleados
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          {setupLink ? (
            <div className="rounded-lg border border-ronda-border bg-ronda-surface p-4 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold text-ronda-text">Enlace de activación</h2>
              <p className="mb-4 text-sm text-ronda-muted">
                No se pudo enviar el email. Comparte este enlace manualmente con el empleado. Expira en 48 horas.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  readOnly
                  value={setupLink}
                  className="min-w-0 rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(setupLink)}
                  className="rounded-lg border border-ronda-border bg-ronda-bg px-4 py-2 text-sm font-semibold text-ronda-text transition hover:bg-ronda-surface"
                >
                  Copiar
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-ronda-border bg-ronda-surface p-4 sm:p-6">
              <h2 className="mb-2 text-lg font-semibold text-ronda-text">Email enviado</h2>
              <p className="text-sm text-ronda-muted">
                Se ha enviado el enlace de activación a <span className="font-semibold">{form.personalEmail}</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-5 lg:h-full lg:overflow-hidden">
      <header className="grid shrink-0 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-ronda-text sm:text-3xl">Nuevo empleado</h1>
          <p className="mt-2 text-sm text-ronda-muted">Crea un nuevo miembro del equipo de Ronda.</p>
        </div>
        <div className="hidden shrink-0 gap-3 sm:flex">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-ronda-border px-4 py-2 text-sm font-semibold text-ronda-text transition hover:bg-ronda-bg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-employee-form"
            disabled={saving}
            className="rounded-lg bg-ronda-coffee px-4 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear empleado'}
          </button>
        </div>
      </header>

      <form
        id="new-employee-form"
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-ronda-border bg-ronda-surface pb-24 sm:pb-0"
      >
        <div className="divide-y divide-ronda-border">

          {/* Información personal */}
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-8">
            <div>
              <h2 className="text-sm font-semibold text-ronda-text">Información personal</h2>
              <p className="mt-1 text-xs text-ronda-muted">Datos de identificación del empleado.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">Nombre completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Juan García López"
                  className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">Email personal *</label>
                <input
                  type="email"
                  value={form.personalEmail}
                  onChange={(e) => set('personalEmail', e.target.value)}
                  placeholder="juan@gmail.com"
                  className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                  required
                  disabled={saving}
                />
                <p className="mt-1.5 text-xs text-ronda-muted/70">Se enviará el enlace de activación a este email.</p>
              </div>
            </div>
          </div>

          {/* Información laboral */}
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-8">
            <div>
              <h2 className="text-sm font-semibold text-ronda-text">Información laboral</h2>
              <p className="mt-1 text-xs text-ronda-muted">Acceso y permisos en el panel interno.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">Código de empleado *</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="flex min-w-0 overflow-hidden rounded-lg border border-ronda-border bg-ronda-bg transition focus-within:border-ronda-gold">
                    <span className="flex items-center border-r border-ronda-border bg-ronda-surface px-3 font-mono text-sm font-semibold text-ronda-muted select-none">
                      500
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.employeeCode.slice(3)}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                        set('employeeCode', '500' + digits);
                      }}
                      placeholder="00000"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm text-ronda-text outline-none placeholder:text-ronda-muted/60"
                      required
                      minLength={5}
                      maxLength={5}
                      pattern="\d{5}"
                      disabled={saving}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set('employeeCode', generateEmployeeCode())}
                    className="rounded-lg border border-ronda-border bg-ronda-bg px-4 py-2 text-sm font-semibold text-ronda-text transition hover:bg-ronda-surface"
                  >
                    Generar
                  </button>
                </div>
                {form.employeeCode.length === 8 && (
                  <p className="mt-1.5 text-xs text-ronda-muted/70">
                    LDAP: <span className="font-mono text-ronda-coffee">{form.employeeCode}@ronda.internal</span>
                  </p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">Contraseña inicial *</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="min-w-0 rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                    required
                    minLength={6}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() => set('password', generatePassword())}
                    className="rounded-lg border border-ronda-border bg-ronda-bg px-4 py-2 text-sm font-semibold text-ronda-text transition hover:bg-ronda-surface"
                  >
                    Generar
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">Rol *</label>
                <select
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition focus:border-ronda-gold"
                  disabled={saving}
                >
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-ronda-text">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set('isActive', e.target.checked)}
                  className="h-4 w-4 accent-ronda-gold"
                  disabled={saving}
                />
                Empleado activo
              </label>
            </div>
          </div>

          {/* Datos bancarios */}
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-8">
            <div>
              <h2 className="text-sm font-semibold text-ronda-text">Datos bancarios</h2>
              <p className="mt-1 text-xs text-ronda-muted">Para gestión de nóminas. Opcional.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-ronda-muted">IBAN</label>
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) => set('iban', e.target.value)}
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
                  onChange={(e) => set('bankHolder', e.target.value)}
                  placeholder="Juan García López"
                  className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

        </div>

        {error && (
          <div className="mx-4 mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:mx-6">
            <p className="text-sm font-medium text-ronda-error">{error}</p>
          </div>
        )}
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-3 border-t border-ronda-border bg-ronda-bg/95 p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-ronda-border bg-ronda-surface px-4 py-2 text-sm font-semibold text-ronda-text transition hover:bg-ronda-bg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="new-employee-form"
          disabled={saving}
          className="rounded-lg bg-ronda-coffee px-4 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:opacity-50"
        >
          {saving ? 'Creando...' : 'Crear empleado'}
        </button>
      </div>
    </div>
  );
}
