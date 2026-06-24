'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteStaffClient, type StaffClient } from '@/lib/api';

type ClientDeleteButtonProps = {
  client: StaffClient;
  onDeleted?: () => void;
  variant?: 'button' | 'icon';
};

export function ClientDeleteButton({ client, onDeleted, variant = 'button' }: ClientDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const canDelete = confirmation.trim() === client.name;

  async function confirmDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError('');

    try {
      await deleteStaffClient(client.id);
      setOpen(false);
      onDeleted?.();
      router.push('/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el cliente');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === 'icon'
            ? 'rounded-lg p-2 text-ronda-error transition hover:bg-red-50'
            : 'min-h-10 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-ronda-error transition hover:border-ronda-error hover:bg-red-100'
        }
        aria-label="Eliminar cliente"
        title="Eliminar cliente"
      >
        {variant === 'icon' ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001-1V5a1 1 0 011-1h4a1 1 0 011 1v1a1 1 0 001 1m-8 0h8" />
          </svg>
        ) : (
          'Eliminar cliente'
        )}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ronda-coffee/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-ronda-border bg-ronda-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ronda-text">Eliminar cliente</h2>
                <p className="mt-2 text-sm leading-6 text-ronda-muted">
                  Se borraran la organizacion, locales, pedidos, mesas, productos, empleados, tickets, suscripciones locales y usuarios exclusivos de este cliente. Esta accion no se puede deshacer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ronda-muted transition hover:bg-ronda-bg disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-ronda-error">Cliente: {client.name}</p>
              <p className="mt-1 text-xs text-ronda-error/80">
                Locales afectados: {client.restaurantsCount}. Propietario: {client.owner.email}.
              </p>
            </div>

            <label className="mt-5 grid gap-1.5 text-xs font-semibold uppercase text-ronda-muted">
              Escribe el nombre del cliente para confirmar
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={deleting}
                className="min-h-10 rounded-lg border border-ronda-border bg-ronda-bg px-3 text-sm font-medium normal-case text-ronda-text outline-none transition focus:border-ronda-gold focus:ring-2 focus:ring-ronda-gold disabled:opacity-60"
                placeholder={client.name}
              />
            </label>

            {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-ronda-error">{error}</p> : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="min-h-10 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!canDelete || deleting}
                className="min-h-10 rounded-lg bg-ronda-error px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
