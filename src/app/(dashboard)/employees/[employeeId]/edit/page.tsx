import { getStaffEmployee } from '@/lib/api';
import { EditEmployeeClient } from './EditEmployeeClient';
import { notFound } from 'next/navigation';

interface EditEmployeePageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { employeeId } = await params;

  let employee;
  try {
    employee = await getStaffEmployee(employeeId);
  } catch {
    notFound();
  }

  return <EditEmployeeClient employee={employee} />;
}
