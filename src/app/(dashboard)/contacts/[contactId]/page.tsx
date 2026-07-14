import { getStaffContact } from '@/lib/api';
import { notFound } from 'next/navigation';
import { ContactDetailPage } from './ContactDetailPage';

interface ContactPageProps {
  params: Promise<{ contactId: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { contactId } = await params;

  try {
    const contact = await getStaffContact(contactId);
    return <ContactDetailPage contact={contact} />;
  } catch {
    notFound();
  }
}
