'use client';

import { useState } from 'react';
import type { StaffClient, StaffEmployee, StaffMember } from '@/lib/api';
import { ClientDetailSidebar } from './clients/ClientDetailSidebar';
import { DashboardContext } from './DashboardContext';
import { EmployeeDetailSidebar } from './employees/EmployeeDetailSidebar';

interface DashboardLayoutClientProps {
  staff: StaffMember | null;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ staff, children }: DashboardLayoutClientProps) {
  const [selectedClient, setSelectedClient] = useState<StaffClient | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<StaffEmployee | null>(null);

  const detailOpen = selectedClient || selectedEmployee;

  return (
    <DashboardContext.Provider value={{ staff, selectedClient, setSelectedClient, selectedEmployee, setSelectedEmployee }}>
      <div className="flex h-screen bg-ronda-bg text-ronda-text overflow-hidden">
        {children}

        {/* Sidebar - al mismo nivel que el menú izquierdo */}
        <div
          className={`h-full shrink-0 overflow-hidden rounded-lg transition-[width,opacity] duration-300 ${
            detailOpen ? 'w-96 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          {selectedClient && <ClientDetailSidebar client={selectedClient} onClose={() => setSelectedClient(null)} />}
          {selectedEmployee && !selectedClient && (
            <EmployeeDetailSidebar employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
          )}
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
