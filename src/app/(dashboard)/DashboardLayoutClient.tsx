'use client';

import { useEffect, useState } from 'react';
import { getStaffMe, type StaffClient, type StaffEmployee, type StaffMember } from '@/lib/api';
import { ClientDetailSidebar } from './clients/ClientDetailSidebar';
import { ContactDetailSidebar } from './contacts/ContactDetailSidebar';
import { DashboardContext } from './DashboardContext';
import { EmployeeDetailSidebar } from './employees/EmployeeDetailSidebar';

interface DashboardLayoutClientProps {
  staff: StaffMember | null;
  children: React.ReactNode;
}

export function DashboardLayoutClient({ staff, children }: DashboardLayoutClientProps) {
  const [selectedClient, setSelectedClient] = useState<StaffClient | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<StaffEmployee | null>(null);
  const [selectedContact, setSelectedContact] = useState<import('@/lib/api').StaffCommercialContact | null>(null);
  const [selectedContactPerson, setSelectedContactPerson] = useState<import('@/lib/api').StaffContactPersonListItem | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  const detailOpen = selectedClient || selectedEmployee || selectedContact || selectedContactPerson;

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
    return <div className="h-screen min-h-dvh bg-ronda-bg" />;
  }

  return (
    <DashboardContext.Provider value={{ staff, selectedClient, setSelectedClient, selectedEmployee, setSelectedEmployee, selectedContact, setSelectedContact, selectedContactPerson, setSelectedContactPerson }}>
      <div className="flex h-screen min-h-dvh overflow-hidden bg-ronda-bg text-ronda-text">
        {children}

        {/* Sidebar - al mismo nivel que el menú izquierdo */}
        <div
          className={`fixed inset-0 z-50 overflow-hidden bg-ronda-surface transition-[transform,opacity,width] duration-300 lg:static lg:h-full lg:shrink-0 lg:rounded-lg ${
            detailOpen
              ? 'translate-x-0 opacity-100 lg:w-96'
              : 'pointer-events-none translate-x-full opacity-0 lg:w-0 lg:translate-x-0'
          }`}
        >
          {selectedClient && <ClientDetailSidebar client={selectedClient} onClose={() => setSelectedClient(null)} />}
          {selectedEmployee && !selectedClient && (
            <EmployeeDetailSidebar employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
          )}
          {selectedContact && !selectedClient && !selectedEmployee && (
            <ContactDetailSidebar
              selection={{ type: 'contact', item: selectedContact }}
              onClose={() => setSelectedContact(null)}
            />
          )}
          {selectedContactPerson && !selectedClient && !selectedEmployee && !selectedContact && (
            <ContactDetailSidebar
              selection={{ type: 'person', item: selectedContactPerson }}
              onClose={() => setSelectedContactPerson(null)}
            />
          )}
        </div>
      </div>
    </DashboardContext.Provider>
  );
}
