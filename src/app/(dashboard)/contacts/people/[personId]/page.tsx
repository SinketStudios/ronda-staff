import { getStaffContactPerson } from '@/lib/api';
import { notFound } from 'next/navigation';
import { ContactPersonDetailPage } from './ContactPersonDetailPage';

interface ContactPersonPageProps {
  params: Promise<{ personId: string }>;
}

export default async function ContactPersonPage({ params }: ContactPersonPageProps) {
  const { personId } = await params;

  try {
    const person = await getStaffContactPerson(personId);
    return <ContactPersonDetailPage person={person} />;
  } catch {
    notFound();
  }
}
