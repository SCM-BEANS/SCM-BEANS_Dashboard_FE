'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { locationsApi } from '@/apis/dolores/locations.api';
import type { Tenant } from '@/types/dolores/tenants';
import type { StoreLocation } from '@/types/dolores/locations';
import { StoreLocationIdSchema } from '@/schemas/dolores/locations';
import { retryDoloresRead } from './queryPolicy';
import { withTenantRequestSlot } from './tenantRequestLimiter';

export const locationQueryKeys = {
  byTenant: (tenantId: string) => ['dolores', 'locations', tenantId] as const,
  byId: (locationId: string) => ['dolores', 'locations', 'id', locationId] as const,
};

export type PlatformLocation = { tenant: Tenant; location: StoreLocation };

export function usePlatformLocations(tenants: Tenant[] | undefined) {
  const tenantList = tenants ?? [];
  const results = useQueries({
    queries: tenantList.map((tenant) => ({
      queryKey: locationQueryKeys.byTenant(tenant.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        withTenantRequestSlot(signal, () => locationsApi.listByTenant(tenant.id, signal)),
      retry: retryDoloresRead,
    })),
  });

  const locations: PlatformLocation[] = [];
  const failedTenants: { tenant: Tenant; error: unknown; retry: () => void }[] = [];
  results.forEach((result, index) => {
    const tenant = tenantList[index];
    if (result.data) result.data.forEach((location) => locations.push({ tenant, location }));
    if (result.isError) failedTenants.push({ tenant, error: result.error, retry: () => { void result.refetch(); } });
  });

  return {
    locations,
    failedTenants,
    isLoading: results.some((result) => result.isPending),
    retryFailed: () => failedTenants.forEach(({ retry }) => retry()),
    refetchAll: () => results.forEach((result) => { void result.refetch(); }),
  };
}

export function useLocationById(locationId: string | undefined, enabled = true) {
  const validLocationId = Boolean(locationId && StoreLocationIdSchema.safeParse(locationId).success);
  return useQuery({
    queryKey: locationQueryKeys.byId(locationId ?? ''),
    queryFn: ({ signal }) => locationsApi.getById(locationId!, signal),
    enabled: enabled && validLocationId,
    retry: retryDoloresRead,
  });
}
