'use client';

import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { requestPasswordRecovery } from '@/lib/api';

const LDAP_STORAGE_KEY = 'ronda_staff_ldap';
const NAME_STORAGE_KEY = 'ronda_staff_name';

export function RecoveryClient() {
  const [savedLdap, setSavedLdap] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    window.setTimeout(() => {
      const saved = localStorage.getItem(LDAP_STORAGE_KEY);
      if (saved) {
        setSavedLdap(saved);
        setEmployeeCode(saved);
      }
      const savedN = localStorage.getItem(NAME_STORAGE_KEY);
      if (savedN) setSavedName(savedN);
      setHydrated(true);
    }, 0);
  }, []);

  function handleForget() {
    setSavedLdap(null);
    setSavedName(null);
    setEmployeeCode('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await requestPasswordRecovery(employeeCode.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo');
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-ronda-bg text-ronda-text lg:grid-cols-[1fr_460px]">
      <section className="hidden border-r border-ronda-border bg-ronda-coffee px-10 py-10 text-ronda-surface lg:flex lg:flex-col">
        <Logo tone="light" className="w-[126px]" priority />
        <div className="mt-auto max-w-xl">
          <p className="text-sm font-semibold uppercase text-ronda-gold">Panel interno</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Operaciones de Ronda</h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Acceso privado para soporte, control de clientes y gestión operativa del equipo.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-8">
        <div className={`w-full max-w-sm rounded-lg border border-ronda-border bg-ronda-surface p-6 shadow-sm transition-opacity duration-150 ${hydrated ? 'opacity-100' : 'opacity-0'}`}>
          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ronda-success/10">
                <svg className="h-6 w-6 text-ronda-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-ronda-text">Correo enviado</h2>
              <p className="mt-2 text-sm text-ronda-muted">
                Si el LDAP <span className="font-mono font-semibold text-ronda-text">{employeeCode}</span> tiene un email asociado, recibirás las instrucciones en breve.
              </p>
              <a
                href="/login"
                className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-ronda-coffee text-sm font-semibold text-white transition hover:bg-ronda-gold-dark"
              >
                Volver al inicio de sesión
              </a>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <Logo className="mb-5 lg:hidden" priority />
                <p className="text-xs font-semibold uppercase text-ronda-muted">Acceso seguro</p>
                <h2 className="mt-2 text-2xl font-semibold text-ronda-coffee">Recuperar contraseña</h2>
                <p className="mt-2 text-sm text-ronda-muted">
                  Te enviaremos un enlace a tu email personal para restablecer tu contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {savedLdap ? (
                  <div className="flex items-center justify-between rounded-lg border border-ronda-border bg-ronda-bg px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-ronda-muted mb-0.5">LDAP</p>
                      <p className="font-mono text-sm font-semibold text-ronda-text">{savedLdap}</p>
                      {savedName && (
                        <p className="text-xs text-ronda-muted mt-0.5">{savedName}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleForget}
                      className="text-xs text-ronda-muted transition hover:text-ronda-error"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <label htmlFor="code" className="grid gap-2 text-sm font-semibold text-ronda-coffee">
                    Código LDAP
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      placeholder="50012345"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      maxLength={8}
                      autoComplete="username"
                      className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-ronda-text outline-none transition focus:border-ronda-gold focus:bg-ronda-surface"
                      disabled={isLoading}
                      autoFocus
                    />
                  </label>
                )}

                {error && (
                  <div className="rounded-lg border border-ronda-error/30 bg-red-50 px-3 py-2">
                    <p className="text-sm font-semibold text-ronda-error">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !employeeCode.trim()}
                  className="min-h-11 w-full rounded-lg bg-ronda-coffee px-4 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:bg-ronda-muted"
                >
                  {isLoading ? 'Enviando...' : 'Restablecer contraseña'}
                </button>

                <a
                  href="/login"
                  className="flex justify-center text-sm text-ronda-muted transition hover:text-ronda-text"
                >
                  Volver al inicio de sesión
                </a>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
