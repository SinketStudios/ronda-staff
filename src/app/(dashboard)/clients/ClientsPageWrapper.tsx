'use client';

import { useContext } from 'react';
import { DashboardContext } from '../DashboardContext';
import type { StaffClient } from '@/lib/api';
import { ClientsPageClient } from './ClientsPageClient';

interface ClientsPageWrapperProps {
  clients: StaffClient[];
}

export function ClientsPageWrapper({ clients }: ClientsPageWrapperProps) {
  const { setSelectedClient, setSelectedEmployee } = useContext(DashboardContext);

  return (
    <ClientsPageClient
      clients={clients}
      onSelectClient={(client) => {
        setSelectedEmployee(null);
        setSelectedClient(client);
      }}
    />
  );
}
