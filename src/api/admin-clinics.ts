import { adminClient } from './admin-client';

export type ClinicStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED';
export type PaymentStatus = 'ok' | 'due-soon' | 'overdue' | 'grace-end' | 'pending';
export type LogoStyle = 'tooth' | 'mono';

// Shape returned by GET /admin/clinics and GET /admin/clinics/:id. The backend
// enriches the raw Clinic document with derived fields (patientsCount,
// lastLoginAt, daysToDue, paymentStatus) so the frontend doesn't have to
// reach into other modules.
export interface ClinicListItem {
  _id: string;
  name: string;
  slug: string;
  doctorName?: string;
  city?: string;
  phone?: string;
  contactEmail?: string;
  status: ClinicStatus;
  brandColor: string;
  logoStyle: LogoStyle;
  subscriptionEndsAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  patientsCount: number;
  lastLoginAt: string | null;
  daysToDue: number | null;
  paymentStatus: PaymentStatus;
  // True once the OWNER has run setupPassword (i.e. the invite-link "create
  // your password" flow). Drives the "Sin activar" badge in the BO.
  activated: boolean;
}

export interface AdminMetrics {
  totalClinics: number;
  activeClinics: number;
  trialClinics: number;
  suspendedClinics: number;
  pendingActivationCount: number;
  totalUsers: number;
  mrr: number;
  planPriceMonthly: number;
  gracePeriodDays: number;
  overdueCount: number;
  graceEndCount: number;
  dueSoonCount: number;
  newThisMonth: number;
}

export interface AdminSettings {
  gracePeriodDays: number;
  planPriceMonthly: number;
  trialDays: number;
}

export interface CreateClinicAccountPayload {
  name: string;
  doctorName: string;
  city?: string;
  phone?: string;
  contactEmail?: string;
  slug?: string;
  password?: string;
  brandColor?: string;
  logoStyle?: LogoStyle;
}

export interface CreateClinicAccountResponse {
  clinic: ClinicListItem;
  ownerCredentials: { username: string; tempPassword: string };
}

export const adminClinicsApi = {
  findAll: (page = 1, limit = 50) =>
    adminClient
      .get<{ data: { clinics: ClinicListItem[]; total: number; page: number; limit: number } }>(
        '/admin/clinics',
        { params: { page, limit } },
      )
      .then(r => r.data.data),

  findById: (id: string) =>
    adminClient
      .get<{ data: ClinicListItem }>(`/admin/clinics/${id}`)
      .then(r => r.data.data),

  checkSlug: (slug: string) =>
    adminClient
      .get<{ data: { available: boolean; slug: string } }>(
        '/admin/clinics/check-slug',
        { params: { slug } },
      )
      .then(r => r.data.data),

  create: (dto: CreateClinicAccountPayload) =>
    adminClient
      .post<{ data: CreateClinicAccountResponse }>('/admin/clinics', dto)
      .then(r => r.data.data),

  // Editar perfil del consultorio (nombre, doctor, color, etc.).
  update: (
    id: string,
    dto: Partial<{
      name: string;
      doctorName: string;
      city: string;
      phone: string;
      contactEmail: string;
      brandColor: string;
      logoStyle: LogoStyle;
    }>,
  ) =>
    adminClient
      .patch<{ data: ClinicListItem }>(`/admin/clinics/${id}`, dto)
      .then(r => r.data.data),

  extendSubscription: (id: string, days: number) =>
    adminClient
      .post<{ data: ClinicListItem }>(`/admin/clinics/${id}/extend-subscription`, { days })
      .then(r => r.data.data),

  recordPayment: (id: string, days?: number) =>
    adminClient
      .post<{ data: ClinicListItem }>(`/admin/clinics/${id}/payment`, days ? { days } : {})
      .then(r => r.data.data),

  suspend: (id: string) =>
    adminClient
      .post<{ data: ClinicListItem }>(`/admin/clinics/${id}/suspend`)
      .then(r => r.data.data),

  reactivate: (id: string) =>
    adminClient
      .post<{ data: ClinicListItem }>(`/admin/clinics/${id}/reactivate`)
      .then(r => r.data.data),

  resetCredentials: (id: string) =>
    adminClient
      .post<{ data: { tempPassword: string } }>(`/admin/clinics/${id}/reset-credentials`)
      .then(r => r.data.data),

  impersonate: (id: string) =>
    adminClient
      .post<{ data: { accessToken: string } }>(`/admin/clinics/${id}/impersonate`)
      .then(r => r.data.data),

  getMetrics: () =>
    adminClient.get<{ data: AdminMetrics }>('/admin/metrics').then(r => r.data.data),

  getSettings: () =>
    adminClient.get<{ data: AdminSettings }>('/admin/settings').then(r => r.data.data),

  updateSettings: (dto: Partial<AdminSettings>) =>
    adminClient.patch<{ data: AdminSettings }>('/admin/settings', dto).then(r => r.data.data),

  listPasswordResetRequests: () =>
    adminClient
      .get<{ data: PasswordResetRequestItem[] }>('/admin/password-reset-requests')
      .then(r => r.data.data),

  countPasswordResetRequests: () =>
    adminClient
      .get<{ data: { count: number } }>('/admin/password-reset-requests/count')
      .then(r => r.data.data),

  resolvePasswordResetRequest: (id: string) =>
    adminClient
      .post<{ data: { _id: string; resolvedAt: string } }>(
        `/admin/password-reset-requests/${id}/resolve`,
      )
      .then(r => r.data.data),

  // ---- Usuarios de la clínica (N por clínica) ----
  listUsers: (id: string) =>
    adminClient
      .get<{ data: ClinicUser[] }>(`/admin/clinics/${id}/users`)
      .then(r => r.data.data),

  createUser: (id: string, dto: CreateClinicUserPayload) =>
    adminClient
      .post<{ data: { user: ClinicUser; tempPassword: string } }>(
        `/admin/clinics/${id}/users`,
        dto,
      )
      .then(r => r.data.data),

  resetUserPassword: (id: string, userId: string) =>
    adminClient
      .post<{ data: { username: string | null; tempPassword: string } }>(
        `/admin/clinics/${id}/users/${userId}/reset-password`,
      )
      .then(r => r.data.data),

  deactivateUser: (id: string, userId: string) =>
    adminClient
      .delete<{ data: { ok: boolean } }>(`/admin/clinics/${id}/users/${userId}`)
      .then(r => r.data.data),
};

export interface ClinicUser {
  _id: string;
  name: string;
  username: string | null;
  role: 'OWNER' | 'MEMBER';
  isClinical: boolean;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
}

export interface CreateClinicUserPayload {
  name: string;
  username: string;
  role?: 'OWNER' | 'MEMBER';
  isClinical?: boolean;
}

export interface PasswordResetRequestItem {
  _id: string;
  identifier: string;
  note: string | null;
  requestedAt: string;
  clinic: {
    _id: string;
    name: string;
    slug: string;
    phone: string | null;
    doctorName: string | null;
  } | null;
  user: { name: string; username: string | null } | null;
}
