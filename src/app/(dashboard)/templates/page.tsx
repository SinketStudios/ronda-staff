import { getEmailTemplates } from '@/lib/api';
import { TemplatesPageClient } from './TemplatesPageClient';

export const metadata = {
  title: 'Plantillas de correo — Ronda',
};

export default async function TemplatesPage() {
  const templates = await getEmailTemplates();

  return <TemplatesPageClient templates={templates} />;
}
