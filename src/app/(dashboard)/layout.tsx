import { redirect } from 'next/navigation';
import { getCurrentStaff } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { StaffSidebarNav } from '@/components/StaffSidebarNav';
import { GlobalSearchBar } from '@/components/GlobalSearchBar';
import { DashboardLayoutClient } from './DashboardLayoutClient';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();

  if (!staff) {
    redirect('/login');
  }

  return (
    <DashboardLayoutClient staff={staff}>
      <aside className="hidden w-72 shrink-0 flex-col border-r border-ronda-border bg-ronda-surface lg:flex">
        <div className="border-b border-ronda-border px-6 py-5">
          <Logo className="mb-4 w-[116px]" priority />
          <div className="rounded-lg border border-ronda-border bg-ronda-bg px-3 py-3">
            <p className="text-xs font-semibold uppercase text-ronda-muted">Sesion interna</p>
            <p className="mt-1 truncate text-sm font-semibold text-ronda-coffee">{staff.name}</p>
            <p className="text-xs text-ronda-muted">{staff.employeeCode} - {staff.role}</p>
          </div>
        </div>

        <StaffSidebarNav />

        <div className="border-t border-ronda-border p-4">
          <form
            action={async () => {
              'use server';
              const { cookies } = await import('next/headers');
              const { logoutStaff } = await import('@/lib/api');
              await logoutStaff();
              (await cookies()).delete('ronda_staff_session');
              redirect('/login');
            }}
          >
            <button
              type="submit"
              className="min-h-10 w-full rounded-lg border border-ronda-border bg-ronda-surface px-3 text-sm font-semibold text-ronda-muted transition hover:border-ronda-error hover:bg-red-50 hover:text-ronda-error"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-ronda-border bg-ronda-surface/92 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 lg:hidden">
            <Logo className="w-[94px]" priority />
            <div className="min-w-0 flex-1">
              <GlobalSearchBar />
            </div>
          </div>
          <div className="lg:hidden">
            <StaffSidebarNav variant="mobile" />
          </div>
          <div className="hidden h-20 items-center px-8 py-4 lg:flex">
            <div className="max-w-xl flex-1">
              <GlobalSearchBar />
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6 lg:overflow-hidden lg:p-8">{children}</div>
      </main>
    </DashboardLayoutClient>
  );
}
