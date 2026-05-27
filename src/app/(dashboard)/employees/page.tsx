import { getStaffEmployees } from '@/lib/api';
import { EmployeesPageClient } from './EmployeesPageClient';

export default async function EmployeesPage() {
  const employees = await getStaffEmployees();

  return <EmployeesPageClient employees={employees} />;
}
