import { adminClient } from './admin-client';

export const adminClinicsApi = {
  findAll: (page = 1, limit = 20) =>
    adminClient.get<{ data: unknown }>('/admin/clinics', { params: { page, limit } }).then(r => r.data.data),

  findById: (id: string) =>
    adminClient.get<{ data: unknown }>(`/admin/clinics/${id}`).then(r => r.data.data),

  updateSubscription: (id: string, dto: { status?: string; subscriptionEndsAt?: string }) =>
    adminClient.patch<{ data: unknown }>(`/admin/clinics/${id}/subscription`, dto).then(r => r.data.data),

  getMetrics: () =>
    adminClient.get<{ data: unknown }>('/admin/metrics').then(r => r.data.data),
};

export const adminBannersApi = {
  findAll: () =>
    adminClient.get<{ data: unknown[] }>('/admin/banners').then(r => r.data.data),

  create: (dto: { title: string; body?: string; ctaLabel?: string; ctaUrl?: string; isActive?: boolean }) =>
    adminClient.post<{ data: unknown }>('/admin/banners', dto).then(r => r.data.data),

  delete: (id: string) =>
    adminClient.delete(`/admin/banners/${id}`),
};
