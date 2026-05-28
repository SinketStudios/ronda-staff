'use client';

import { useEffect, useState } from 'react';
import { getStaffMe, type StaffClient, type StaffEmployee, type StaffMember } from '@/lib/api';
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
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  const detailOpen = selectedClient || selectedEmployee;

  useEffect(() => {
    let cancelled = false;
    let checkId = 0;

    async function redirectIfUnauthenticated({ hideImmediately = false } = {}) {
      const currentCheckId = ++checkId;
      if (hideImmediately) {
        setIsCheckingSession(true);
      }

      const currentStaff = await getStaffMe();

      if (cancelled || currentCheckId !== checkId) {
        return;
      }

      if (!currentStaff) {
        window.location.replace('/login');
        return;
      }

      setIsCheckingSession(false);
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      void redirectIfUnauthenticated({ hideImmediately: event.persisted });
    };

    void redirectIfUnauthenticated();
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  if (isCheckingSession) {
    return <div className="h-screen bg-ronda-bg" />;
  }

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
