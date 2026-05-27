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
  return Array.from(values)
    .map((value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length])
    .join('');
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
    employeeCode: '',
    name: '',
    email: '',
    personalEmail: '',
    role: 'staff',
    password: '',
    isActive: true,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const result = await createStaffEmployee({
        employeeCode: form.employeeCode.trim(),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        personalEmail: form.personalEmail.trim() || undefined,
        role: form.role,
        password: form.password,
        isActive: form.isActive,
      });

      setSetupLink(result.setupLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el empleado');
      setSaving(false);
    }
  }

  if (setupLink !== null) {
    return (
      <div className="flex h-full flex-col gap-5 overflow-hidden">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-ronda-text">Empleado creado</h1>
            <p className="mt-2 text-sm text-ronda-muted">
              El empleado ha sido creado exitosamente.
            </p>
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
          <div className="space-y-6">
            {setupLink && (
              <div className="rounded-lg border border-ronda-border bg-ronda-surface p-6">
                <h2 className="mb-4 text-lg font-semibold text-ronda-text">Enviar invitación al empleado</h2>
                <p className="mb-4 text-sm text-ronda-muted">
                  Comparte este enlace con el empleado para que pueda configurar su cuenta. El enlace expira en 48 horas.
                </p>

                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={setupLink}
                    className="flex-1 rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(setupLink);
                      alert('Enlace copiado al portapapeles');
                    }}
                    className="rounded-lg border border-ronda-border bg-ronda-bg px-4 py-2 text-sm font-semibold text-ronda-text transition hover:bg-ronda-surface"
                  >
                    Copiar
                  </button>
                </div>

                <p className="text-xs text-ronda-muted/70">
                  Puedes enviar este enlace por email, chat, o cualquier otro medio.
                </p>
              </div>
            )}

            {form.email && !setupLink && (
              <div className="rounded-lg border border-ronda-border bg-ronda-surface p-6">
                <h2 className="mb-2 text-lg font-semibold text-ronda-text">Email enviado</h2>
                <p className="text-sm text-ronda-muted">
                  Se ha enviado un email de configuración a <span className="font-semibold">{form.email}</span>. El empleado recibirá un enlace para completar su configuración.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-ronda-text">Nuevo empleado</h1>
          <p className="mt-2 text-sm text-ronda-muted">
            Crea un nuevo empleado para tu equipo de Ronda.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
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
            className="rounded-lg bg-ronda-coffee px-4 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear empleado'}
          </button>
        </div>
      </header>

      {/* Form */}
      <form id="new-employee-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ronda-border bg-ronda-surface">
        <div className="min-h-0 flex-1 overflow-auto p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ronda-muted mb-2">
              Nombre completo *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Juan García López"
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
              required
            />
          </div>

          {/* Email de invitación */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ronda-muted mb-2">
              Email de invitación (opcional)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="juan@ejemplo.com"
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
            />
            <p className="mt-2 text-xs text-ronda-muted/70">
              Si añades un email, se enviará automáticamente un enlace de configuración. Si no, deberás compartir el enlace manualmente.
            </p>
          </div>

          {/* Email personal */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ronda-muted mb-2">
              Email personal (opcional)
            </label>
            <input
              type="email"
              value={form.personalEmail}
              onChange={(event) => setForm({ ...form, personalEmail: event.target.value })}
              placeholder="juan@gmail.com"
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
            />
            <p className="mt-2 text-xs text-ronda-muted/70">
              Email para recibir notificaciones importantes: cambios de contraseña, notificaciones de la empresa, etc.
            </p>
          </div>

          {/* Código */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ronda-muted mb-2">
              Código de empleado *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.employeeCode}
                onChange={(event) => setForm({ ...form, employeeCode: event.target.value })}
                placeholder="50012345"
                className="flex-1 rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                required
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, employeeCode: generateEmployeeCode() })}
                className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-4 text-sm font-semibold text-ronda-text transition hover:bg-ronda-surface"
              >
                Generar
              </button>
            </div>
            {form.employeeCode && (
              <p className="mt-2 text-xs text-ronda-muted/70">
                LDAP: <span className="font-mono text-ronda-coffee">{form.employeeCode}@ronda.internal</span>
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ronda-muted mb-2">
              Contraseña inicial *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="flex-1 rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, password: generatePassword() })}
                className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-4 text-sm font-semibold text-ronda-text transition hover:bg-ronda-surface"
              >
                Generar
              </button>
            </div>
            <p className="mt-2 text-xs text-ronda-muted/70">
              Comparte esta contraseña con el empleado. En el primer acceso deberá cambiarla.
            </p>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-semibold uppercase text-ronda-muted mb-2">
              Rol *
            </label>
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              className="w-full rounded-lg border border-ronda-border bg-ronda-bg px-3 py-2 text-sm text-ronda-text outline-none transition focus:border-ronda-gold"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Activo */}
          <label className="flex items-center gap-2 text-sm font-medium text-ronda-text">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 accent-ronda-gold"
            />
            Empleado activo
          </label>

          {/* Error */}
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
