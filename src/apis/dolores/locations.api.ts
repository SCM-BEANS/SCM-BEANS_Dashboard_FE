import { requestDolores } from './client';
import { StoreLocationListSchema, unwrapLocations } from '@/schemas/dolores/locations';

export const locationsApi = {
  listByTenant: async (tenantId: string, signal?: AbortSignal) => {
    const response = await requestDolores(
      { method: 'GET', url: '/locations', params: { tenantId, activeOnly: false }, signal },
      StoreLocationListSchema
    );
    return unwrapLocations(response);
  },
};
