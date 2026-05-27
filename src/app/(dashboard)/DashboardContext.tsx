'use client';

import { createContext, useContext } from 'react';
import type { StaffClient, StaffEmployee, StaffMember } from '@/lib/api';

export const DashboardContext = createContext<{
  staff: StaffMember | null;
  selectedClient: StaffClient | null;
  setSelectedClient: (client: StaffClient | null) => void;
  selectedEmployee: StaffEmployee | null;
  setSelectedEmployee: (employee: StaffEmployee | null) => void;
}>({
  staff: null,
  selectedClient: null,
  setSelectedClient: () => {},
  selectedEmployee: null,
  setSelectedEmployee: () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}
