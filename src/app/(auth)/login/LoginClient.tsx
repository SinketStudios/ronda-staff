'use client';

import { useState } from 'react';
import { loginStaff } from '@/lib/api';
import { Logo } from '@/components/Logo';

export function LoginClient() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginStaff(employeeCode, password);
      window.location.replace('/dashboard');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesion';
      setError(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 bg-ronda-bg text-ronda-text lg:grid-cols-[1fr_460px]">
      <section className="hidden border-r border-ronda-border bg-ronda-coffee px-10 py-10 text-ronda-surface lg:flex lg:flex-col">
        <Logo tone="light" className="w-[126px]" priority />
        <div className="mt-auto max-w-xl">
          <p className="text-sm font-semibold uppercase text-ronda-gold">Panel interno</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Operaciones de Ronda</h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Acceso privado para soporte, control de clientes y gestion operativa del equipo.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm rounded-lg border border-ronda-border bg-ronda-surface p-6 shadow-sm">
          <div className="mb-7">
            <Logo className="mb-5 lg:hidden" priority />
            <p className="text-xs font-semibold uppercase text-ronda-muted">Acceso seguro</p>
            <h2 className="mt-2 text-2xl font-semibold text-ronda-coffee">Ronda Staff</h2>
            <p className="mt-2 text-sm text-ronda-muted">Introduce tus credenciales internas para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label htmlFor="code" className="grid gap-2 text-sm font-semibold text-ronda-coffee">
              Codigo LDAP
              <input
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="50012345"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoComplete="username"
                className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-ronda-text outline-none transition focus:border-ronda-gold focus:bg-ronda-surface"
                disabled={isLoading}
              />
            </label>

            <label htmlFor="password" className="grid gap-2 text-sm font-semibold text-ronda-coffee">
              Contrasena
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-ronda-text outline-none transition focus:border-ronda-gold focus:bg-ronda-surface"
                disabled={isLoading}
              />
            </label>

            {error && (
              <div className="rounded-lg border border-ronda-error/30 bg-red-50 px-3 py-2">
                <p className="text-sm font-semibold text-ronda-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="min-h-11 w-full rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:bg-ronda-muted"
            >
              {isLoading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </button>
          </form>

          <div className="mt-6 border-t border-ronda-border pt-5">
            <a href="/employees" className="text-sm font-semibold text-ronda-gold-dark transition hover:text-ronda-coffee">
              Gestion de empleados
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
