import { getStaffEmployee } from '@/lib/api';
import { EditEmployeeClient } from './EditEmployeeClient';
import { notFound } from 'next/navigation';

interface EditEmployeePageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const { employeeId } = await params;

  try {
    const employee = await getStaffEmployee(employeeId);
    return <EditEmployeeClient employee={employee} />;
  } catch {
    notFound();
  }
}
