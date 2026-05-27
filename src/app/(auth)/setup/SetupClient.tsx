'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setupStaffAccount } from '@/lib/api';
import { Logo } from '@/components/Logo';

interface SetupClientProps {
  token: string;
}

export function SetupClient({ token }: SetupClientProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const errorMsg = err instanceof Error ? err.message : 'Error al configurar la cuenta';
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
          {!success ? (
            <>
              <div className="mb-7">
                <Logo className="mb-5 lg:hidden" priority />
                <p className="text-xs font-semibold uppercase text-ronda-muted">Configurar cuenta</p>
                <h2 className="mt-2 text-2xl font-semibold text-ronda-coffee">Ronda Staff</h2>
                <p className="mt-2 text-sm text-ronda-muted">Establece tu contraseña para acceder al panel.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label htmlFor="password" className="grid gap-2 text-sm font-semibold text-ronda-coffee">
                  Contraseña
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:bg-ronda-surface"
                    disabled={isLoading}
                    required
                  />
                </label>

                <label htmlFor="confirm-password" className="grid gap-2 text-sm font-semibold text-ronda-coffee">
                  Confirmar contraseña
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    className="min-h-11 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-ronda-text outline-none transition placeholder:text-ronda-muted/60 focus:border-ronda-gold focus:bg-ronda-surface"
                    disabled={isLoading}
                    required
                  />
                </label>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-ronda-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-11 rounded-lg bg-ronda-coffee px-4 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? 'Configurando...' : 'Configurar cuenta'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-7">
                <Logo className="mb-5 lg:hidden" priority />
                <p className="text-xs font-semibold uppercase text-ronda-muted">¡Éxito!</p>
                <h2 className="mt-2 text-2xl font-semibold text-ronda-coffee">Cuenta configurada</h2>
                <p className="mt-2 text-sm text-ronda-muted">Tu contraseña ha sido guardada. Puedes acceder al panel ahora.</p>
              </div>

              <button
                onClick={() => router.push('/login')}
                className="w-full min-h-11 rounded-lg bg-ronda-coffee px-4 py-2 text-sm font-semibold text-white transition hover:bg-ronda-gold-dark"
              >
                Ir al panel de acceso
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
