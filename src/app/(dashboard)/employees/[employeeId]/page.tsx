import { getStaffEmployee } from '@/lib/api';
import { EmployeeDetailPage } from './EmployeeDetailPage';
import { notFound } from 'next/navigation';

interface EmployeePageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EmployeePage({ params }: EmployeePageProps) {
  const { employeeId } = await params;

  try {
    const employee = await getStaffEmployee(employeeId);
    return <EmployeeDetailPage employee={employee} />;
  } catch {
    notFound();
  }
}
