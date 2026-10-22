import { doloresAxiosClient, parseDoloresResponse } from './client';
import { TenantListSchema, TenantSchema } from '@/schemas/dolores/tenants';
import type { Tenant } from '@/types/dolores/tenants';

export const tenantsApi = {
  list: async (signal?: AbortSignal): Promise<Tenant[]> => {
    const response = await doloresAxiosClient.get<unknown>('/tenants', { signal });
    return parseDoloresResponse(response.data, TenantListSchema);
  },
  get: async (id: string, signal?: AbortSignal): Promise<Tenant> => {
    const response = await doloresAxiosClient.get<unknown>(`/tenants/${encodeURIComponent(id)}`, { signal });
    return parseDoloresResponse(response.data, TenantSchema);
  },
};
