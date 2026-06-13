import { getStaffEmployee } from '@/lib/api';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { notFound } from 'next/navigation';

interface EmployeePageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EmployeePage({ params }: EmployeePageProps) {
  const { employeeId } = await params;

  let employee;
  try {
    employee = await getStaffEmployee(employeeId);
  } catch {
    notFound();
  }

  return <EmployeeDetailPage employee={employee} />;
}
