'use client';

import { createContext, useContext } from 'react';
import type { StaffClient, StaffCommercialContact, StaffContactPersonListItem, StaffEmployee, StaffMember } from '@/lib/api';

export const DashboardContext = createContext<{
  staff: StaffMember | null;
  selectedClient: StaffClient | null;
  setSelectedClient: (client: StaffClient | null) => void;
  selectedEmployee: StaffEmployee | null;
  setSelectedEmployee: (employee: StaffEmployee | null) => void;
  selectedContact: StaffCommercialContact | null;
  setSelectedContact: (contact: StaffCommercialContact | null) => void;
  selectedContactPerson: StaffContactPersonListItem | null;
  setSelectedContactPerson: (person: StaffContactPersonListItem | null) => void;
}>({
  staff: null,
  selectedClient: null,
  setSelectedClient: () => {},
  selectedEmployee: null,
  setSelectedEmployee: () => {},
  selectedContact: null,
  setSelectedContact: () => {},
  selectedContactPerson: null,
  setSelectedContactPerson: () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}
