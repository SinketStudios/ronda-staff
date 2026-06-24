const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

async function getServerCookieHeader(): Promise<string | undefined> {
  if (typeof window !== 'undefined') return undefined;
  const { cookies } = await import('next/headers');
  const session = (await cookies()).get('ronda_staff_session')?.value;
  return session ? `ronda_staff_session=${encodeURIComponent(session)}` : undefined;
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
}

export interface StaffEmployee {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  email?: string;
  personalEmail?: string;
  isActive: boolean;
  iban?: string;
  bankHolder?: string;
  createdAt: string;
}

export type RestaurantBillingSubscription = {
  planId: string | null;
  billingCycle: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanId: string | null;
  scheduledBillingCycle: string | null;
  stripeSubscriptionId: string | null;
};

export type StaffClientRestaurant = {
  id: string;
  name: string;
  city: string | null;
  portalSubdomain: string;
  paymentStatus: 'not_configured' | 'pending' | 'active' | 'restricted';
  onboardingCompleted: boolean;
  createdAt: string;
  subscription: RestaurantBillingSubscription | null;
};

export type StaffClient = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  paymentStatus: 'not_configured' | 'pending' | 'active' | 'restricted';
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    source: 'database';
    status: string | null;
    planId: string | null;
    planName: string | null;
    billingCycle: string | null;
    amountCents: number | null;
    currency: string | null;
  };
  restaurantsCount: number;
  primaryRestaurant: StaffClientRestaurant | null;
  restaurants?: StaffClientRestaurant[];
};

export type CreateStaffClientInput = {
  organizationName: string;
  legalName?: string;
  companyType?: string;
  taxId?: string;
  phone?: string;
  country?: string;
  ownerName: string;
  ownerEmail: string;
  planId: 'demo' | 'starter' | 'pro' | 'business';
  billingCycle: 'monthly' | 'annual';
  trialDays?: number;
};

export type AutomationStatus = 'draft' | 'active' | 'paused';

export type StaffAutomationWorkflow = {
  id: string;
  restaurantId: string | null;
  restaurant: { id: string; name: string; portalSubdomain: string } | null;
  name: string;
  description: string | null;
  status: AutomationStatus;
  nodes: unknown;
  edges: unknown;
  createdByStaffId: string | null;
  createdByStaff: { id: string; name: string; employeeCode: string } | null;
  runs: number;
  createdAt: string;
  updatedAt: string;
};

export type StaffAutomationRun = {
  id: string;
  workflowId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  input: unknown;
  output: unknown | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  logs: Array<{
    id: string;
    runId: string;
    nodeId: string | null;
    level: 'info' | 'warn' | 'error';
    message: string;
    data: unknown | null;
    createdAt: string;
  }>;
};

export async function loginStaff(employeeCode: string, password: string): Promise<StaffMember> {
  try {
    const res = await fetch(`${API_URL}/staff/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ employeeCode, password }),
    });

    console.log('Login response status:', res.status);

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `Login failed with status ${res.status}`);
    }

    const data = await res.json();
    console.log('Login successful, staff:', data.staff);
    return data.staff;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function logoutStaff(): Promise<void> {
  try {
    const cookieHeader = await getServerCookieHeader();
    await fetch(`${API_URL}/staff/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function getStaffMe(): Promise<StaffMember | null> {
  try {
    const cookieHeader = await getServerCookieHeader();
    const res = await fetch(`${API_URL}/staff/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('Get staff me error:', error);
    return null;
  }
}

export async function getStaffClients(): Promise<StaffClient[]> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/clients`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudieron cargar los clientes${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function getStaffClient(clientId: string): Promise<StaffClient> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/clients/${clientId}`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudo cargar el cliente${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function createStaffClient(input: CreateStaffClientInput): Promise<StaffClient> {
  const res = await fetch(`${API_URL}/staff/clients`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo crear el cliente (${res.status})`);
  }

  return res.json();
}

export async function deleteStaffClient(clientId: string): Promise<void> {
  const res = await fetch(`${API_URL}/staff/clients/${clientId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo eliminar el cliente (${res.status})`);
  }
}

export async function getStaffAutomations(): Promise<StaffAutomationWorkflow[]> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/automations`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudieron cargar las automatizaciones${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function getStaffAutomation(id: string): Promise<StaffAutomationWorkflow> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/automations/${id}`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudo cargar la automatizacion${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function createStaffAutomation(input: {
  name: string;
  description?: string;
  restaurantId?: string | null;
  status?: AutomationStatus;
  nodes?: unknown;
  edges?: unknown;
}): Promise<StaffAutomationWorkflow> {
  const res = await fetch(`${API_URL}/staff/automations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo crear la automatizacion (${res.status})`);
  }

  return res.json();
}

export async function updateStaffAutomation(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    restaurantId?: string | null;
    status?: AutomationStatus;
    nodes?: unknown;
    edges?: unknown;
  },
): Promise<StaffAutomationWorkflow> {
  const res = await fetch(`${API_URL}/staff/automations/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo guardar la automatizacion (${res.status})`);
  }

  return res.json();
}

export async function runStaffAutomation(id: string, input: unknown = {}): Promise<StaffAutomationRun> {
  const res = await fetch(`${API_URL}/staff/automations/${id}/run`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo ejecutar la automatizacion (${res.status})`);
  }

  return res.json();
}

export async function getStaffEmployees(): Promise<StaffEmployee[]> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/employees`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudieron cargar los empleados${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function getStaffEmployee(employeeId: string): Promise<StaffEmployee> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/employees/${employeeId}`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudo cargar el empleado${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function sendEmployeeTestEmail(id: string): Promise<{ sent: boolean; to: string }> {
  const res = await fetch(`${API_URL}/staff/employees/${id}/send-test-email`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Error al enviar el correo (${res.status})`);
  }

  return res.json();
}

export async function updateStaffEmployee(
  id: string,
  input: {
    name?: string;
    personalEmail?: string;
    role?: string;
    isActive?: boolean;
    iban?: string;
    bankHolder?: string;
  },
): Promise<StaffEmployee> {
  const res = await fetch(`${API_URL}/staff/employees/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo actualizar el empleado (${res.status})`);
  }

  return res.json();
}

export async function createStaffEmployee(input: {
  employeeCode: string;
  name: string;
  email?: string;
  personalEmail?: string;
  role: string;
  password: string;
  isActive?: boolean;
  iban?: string;
  bankHolder?: string;
}): Promise<{ employee: StaffEmployee; setupLink: string | null }> {
  const res = await fetch(`${API_URL}/staff/employees`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo crear el empleado (${res.status})`);
  }

  return res.json();
}

export async function requestPasswordRecovery(employeeCode: string): Promise<void> {
  const res = await fetch(`${API_URL}/staff/auth/recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeCode }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Error al enviar el correo (${res.status})`);
  }
}

export async function getPasswordResetInfo(token: string): Promise<{ name: string; employeeCode: string }> {
  const res = await fetch(`${API_URL}/staff/auth/password?token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Token inválido o expirado');
  }

  return res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/staff/auth/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Error al restablecer la contraseña (${res.status})`);
  }
}

export async function getSetupInfo(token: string): Promise<{ name: string; employeeCode: string }> {
  const res = await fetch(`${API_URL}/staff/auth/setup?token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Token inválido o expirado');
  }

  return res.json();
}

export async function setupStaffAccount(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/staff/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Error al configurar la cuenta (${res.status})`);
  }
}

export interface AuditLogEntry {
  id: string;
  staffMemberId: string | null;
  staffMember: { id: string; name: string; employeeCode: string; role: string } | null;
  method: string;
  action: string;
  endpoint: string;
  requestBody: Record<string, unknown> | null;
  responseStatus: number;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type SupportTicket = {
  id: string;
  reference: string;
  category: string;
  topic: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  closedAt: string | null;
  customer: { id: string; name: string; email: string } | null;
  organization: { id: string; name: string } | null;
  restaurant: { id: string; name: string; city: string | null } | null;
  messages: Array<{
    id: string;
    authorType: 'customer' | 'staff';
    body: string;
    createdAt: string;
    author: { id: string; name: string; email?: string; employeeCode?: string } | null;
    attachments: Array<{ id: string; filename: string; url: string; size: number; mimeType: string | null }>;
  }>;
  attachments: Array<{
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string | null;
    createdAt: string;
  }>;
};

export async function getSupportTickets(): Promise<SupportTicket[]> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/support/tickets`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`No se pudieron cargar los tickets${detail ? `: ${detail}` : ''}`);
  }

  return res.json();
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const res = await fetch(`${API_URL}/staff/support/tickets`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Error al cargar tickets (${res.status})`);
  return res.json();
}

export async function replySupportTicket(ticketId: string, body: string, files: File[] = []): Promise<SupportTicket> {
  const form = new FormData();
  form.append('body', body);
  for (const file of files) {
    form.append('files', file);
  }

  const res = await fetch(`${API_URL}/staff/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo responder el ticket (${res.status})`);
  }

  return res.json();
}

export async function closeSupportTicket(ticketId: string): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/staff/support/tickets/${ticketId}/close`, {
    method: 'PATCH',
    credentials: 'include',
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `No se pudo cerrar el ticket (${res.status})`);
  }

  return res.json();
}

export async function getAuditLogs(params?: {
  staffMemberId?: string;
  action?: string;
  endpoint?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<AuditLogResponse> {
  const cookieHeader = await getServerCookieHeader();

  const qs = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';

  const res = await fetch(`${API_URL}/internal/audit-logs${qs}`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch audit logs: ${res.status}`);
  }

  return res.json();
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
}

export interface EmailTemplateDetail extends EmailTemplate {
  html: string;
  text: string;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/templates`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch email templates: ${res.status}`);
  }

  return res.json();
}

export async function getEmailTemplate(id: string): Promise<EmailTemplateDetail> {
  const cookieHeader = await getServerCookieHeader();
  const res = await fetch(`${API_URL}/staff/templates/${id}`, {
    method: 'GET',
    credentials: 'include',
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch email template: ${res.status}`);
  }

  return res.json();
}
