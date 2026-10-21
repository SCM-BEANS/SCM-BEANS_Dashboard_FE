import { requestDolores } from './client';
import { TenantListSchema, TenantSchema } from '@/schemas/dolores/tenants';

export const tenantsApi = {
  list: (signal?: AbortSignal) =>
    requestDolores({ method: 'GET', url: '/tenants', signal }, TenantListSchema),
  get: (id: string, signal?: AbortSignal) =>
    requestDolores({ method: 'GET', url: `/tenants/${encodeURIComponent(id)}`, signal }, TenantSchema),
};
