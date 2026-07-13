'use client';

import { useState } from 'react';
import { resendStaffClientInvitation, type StaffClient } from '@/lib/api';

type ClientResendInvitationButtonProps = {
  client: StaffClient;
  variant?: 'button' | 'icon';
};

function isDemoClient(client: StaffClient) {
  return client.subscription.planId === 'demo' || client.subscription.planName?.toLowerCase() === 'demo';
}

export function ClientResendInvitationButton({ client, variant = 'button' }: ClientResendInvitationButtonProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!isDemoClient(client)) {
    return null;
  }

  async function handleClick() {
    if (status === 'sending') return;
    setStatus('sending');
    try {
      await resendStaffClientInvitation(client.id);
      setStatus('sent');
      window.setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 3500);
    }
  }

  const label = status === 'sending' ? 'Enviando...' : status === 'sent' ? 'Invitacion enviada' : status === 'error' ? 'Error al enviar' : 'Reenviar invitacion';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'sending'}
        className="rounded-lg p-2 text-ronda-muted transition hover:bg-ronda-bg hover:text-ronda-text disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={label}
        title={label}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'sending'}
      className="min-h-10 rounded-lg border border-ronda-border px-4 text-sm font-semibold text-ronda-coffee transition hover:bg-ronda-bg disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
