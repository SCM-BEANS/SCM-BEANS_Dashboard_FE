import { doloresAxiosClient, parseDoloresResponse } from './client';
import { StoreLocationIdSchema, StoreLocationListSchema, StoreLocationSchema, unwrapLocations } from '@/schemas/dolores/locations';
import type { StoreLocation } from '@/types/dolores/locations';

export const locationsApi = {
  listByTenant: async (tenantId: string, signal?: AbortSignal): Promise<StoreLocation[]> => {
    const response = await doloresAxiosClient.get<unknown>('/locations', {
      params: { tenantId, activeOnly: false },
      signal,
    });
    const locations = parseDoloresResponse(response.data, StoreLocationListSchema);
    return unwrapLocations(locations);
  },

  getById: async (locationId: string, signal?: AbortSignal): Promise<StoreLocation> => {
    const response = await doloresAxiosClient.get<unknown>(
      '/locations/' + encodeURIComponent(StoreLocationIdSchema.parse(locationId)),
      { signal }
    );
    return parseDoloresResponse(response.data, StoreLocationSchema);
  },
};
