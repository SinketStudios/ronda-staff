'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setupStaffAccount } from '@/lib/api';
import { Logo } from '@/components/Logo';

interface SetupClientProps {
  token: string;
  step: number;
  name: string;
  employeeCode: string;
}

const ROW_WIDTHS = [
  [88, 120, 60, 80, 56],
  [72, 104, 52, 96, 48],
  [96, 136, 68, 72, 64],
  [80, 112, 44, 88, 52],
  [68, 96,  72, 64, 60],
  [84, 128, 56, 104, 44],
  [76, 108, 64, 80, 56],
  [92, 140, 48, 92, 68],
  [80, 116, 60, 76, 52],
  [64, 100, 76, 60, 48],
];

function FakeDashboard() {
  const navItems = ['Panel', 'Clientes', 'Biblioteca', 'Incidencias', 'Empleados', 'Plantillas'];

  return (
    <div className="absolute inset-0 flex overflow-hidden select-none pointer-events-none" aria-hidden>
      {/* Sidebar — w-72 idéntico al real */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-ronda-border bg-ronda-surface">
        {/* Header: logo + sesión */}
        <div className="border-b border-ronda-border px-6 py-5">
          <Logo className="mb-4 w-[116px] opacity-60" />
          <div className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-3 space-y-1.5">
            <div className="h-2 w-20 rounded-full bg-ronda-border/50" />
            <div className="h-3 w-36 rounded-full bg-ronda-border/40" />
            <div className="h-2.5 w-28 rounded-full bg-ronda-border/30" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-4 py-5">
          {navItems.map((label, i) => (
            <div
              key={i}
              className={`h-11 rounded-lg px-3 flex items-center text-sm font-semibold ${
                i === 1
                  ? 'bg-ronda-coffee/50 text-white/60'
                  : 'text-ronda-muted/40'
              }`}
            >
              {label}
            </div>
          ))}
        </nav>

        {/* Footer: logout */}
        <div className="border-t border-ronda-border p-4">
          <div className="h-10 w-full rounded-lg border border-ronda-border bg-ronda-surface" />
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 overflow-hidden flex flex-col">
        {/* Top header con búsqueda */}
        <div className="h-20 border-b border-ronda-border bg-ronda-surface/80 shrink-0 px-8 flex items-center">
          <div className="h-10 w-80 rounded-lg border border-ronda-border bg-ronda-bg" />
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden p-8 flex flex-col gap-5">
          {/* Page header */}
          <div className="flex items-start justify-between shrink-0">
            <div className="space-y-2">
              <div className="h-8 w-36 rounded-lg bg-ronda-border/40" />
              <div className="h-3 w-52 rounded-full bg-ronda-border/25" />
            </div>
            <div className="h-10 w-32 rounded-lg bg-ronda-coffee/25" />
          </div>

          {/* Table */}
          <div className="rounded-lg border border-ronda-border bg-ronda-surface overflow-hidden">
            <div className="h-12 bg-ronda-bg border-b border-ronda-border flex items-center gap-8 px-6">
              {[52, 88, 116, 64, 56].map((w, i) => (
                <div key={i} className="h-2.5 rounded-full bg-ronda-border/55" style={{ width: w }} />
              ))}
            </div>
            {ROW_WIDTHS.map((cols, i) => (
              <div key={i} className="h-16 border-b border-ronda-border last:border-0 flex items-center gap-8 px-6">
                {cols.map((w, j) => (
                  <div
                    key={j}
                    className={`h-2.5 rounded-full ${j === 4 ? 'rounded-lg h-6' : ''} bg-ronda-border/${j === 0 ? '40' : j === 4 ? '20' : '30'}`}
                    style={{ width: w }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function SetupClient({ token, step, name, employeeCode }: SetupClientProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const ldap = employeeCode;

  function goToStep(n: number) {
    router.push(`/setup?token=${encodeURIComponent(token)}&step=${n}`);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(ldap);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await setupStaffAccount(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al configurar la cuenta');
      setIsLoading(false);
    }
  }

  function renderStep() {
    if (success) {
      return (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ronda-success/10">
            <svg className="h-6 w-6 text-ronda-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-ronda-text">¡Todo listo!</h2>
          <p className="mt-2 text-sm text-ronda-muted">Tu cuenta ha sido configurada correctamente.</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-6 w-full min-h-11 rounded-lg bg-ronda-coffee text-sm font-semibold text-white transition hover:bg-ronda-gold-dark"
          >
            Entrar al panel
          </button>
        </div>
      );
    }

    if (step === 1) {
      return (
        <>
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase text-ronda-muted">Paso 1 de 2</p>
            <h2 className="mt-2 text-xl font-semibold text-ronda-text">Hola, {name}</h2>
            <p className="mt-1.5 text-sm text-ronda-muted">
              Bienvenido al equipo de Ronda. Antes de continuar, guarda bien el siguiente dato.
            </p>
          </div>

          {/* LDAP card */}
          <div className="rounded-xl border border-ronda-gold/30 bg-ronda-gold/5 p-5 mb-6">
            <p className="text-xs font-semibold uppercase text-ronda-gold-dark mb-3">Tu LDAP</p>
            <p className="font-mono text-4xl font-bold tracking-wider text-ronda-text mb-3">{ldap}</p>
            <p className="text-xs text-ronda-muted leading-relaxed mb-4">
              Este es tu <span className="font-semibold text-ronda-text">DNI digital</span> dentro de Ronda.
              Lo usarás para iniciar sesión y en todos los procesos internos. Guárdalo en un lugar seguro.
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full rounded-lg border border-ronda-gold/30 bg-ronda-surface px-3 py-2 text-xs font-semibold text-ronda-gold-dark transition hover:bg-ronda-gold/10"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => goToStep(2)}
            className="w-full min-h-11 rounded-lg bg-ronda-coffee text-sm font-semibold text-white transition hover:bg-ronda-gold-dark"
          >
            Entendido, continuar
          </button>
        </>
      );
    }

    return (
      <>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-ronda-muted">Paso 2 de 2</p>
          <h2 className="mt-2 text-xl font-semibold text-ronda-text">Establece tu contraseña</h2>
          <p className="mt-1.5 text-sm text-ronda-muted">
            Elige una contraseña segura para acceder al panel de Ronda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="grid gap-2 text-sm font-semibold text-ronda-text">
            Nueva contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 font-normal text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
              disabled={isLoading}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-ronda-text">
            Confirmar contraseña
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
              className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 font-normal text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold"
              disabled={isLoading}
              required
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-medium text-ronda-error">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => goToStep(1)}
              disabled={isLoading}
              className="min-h-11 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-muted transition hover:bg-ronda-bg disabled:opacity-50"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 min-h-11 rounded-lg bg-ronda-coffee text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ronda-bg text-ronda-text">
      <FakeDashboard />

      {/* Backdrop */}
      <div className="absolute inset-0 bg-ronda-bg/50 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-ronda-border bg-ronda-surface shadow-2xl overflow-hidden">

          {/* Modal header */}
          <div className="flex items-center justify-between border-b border-ronda-border px-6 py-4">
            <Logo className="w-[90px]" priority />
            <div className="flex items-center gap-2">
              {!success && [1, 2].map((s) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? 'w-6 bg-ronda-coffee' : s < step ? 'w-1.5 bg-ronda-coffee/40' : 'w-1.5 bg-ronda-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
