'use client';

import { useQueries } from '@tanstack/react-query';
import { locationsApi } from '@/apis/dolores/locations.api';
import type { Tenant } from '@/schemas/dolores/tenants';
import type { StoreLocation } from '@/schemas/dolores/locations';
import { retryDoloresRead } from './queryPolicy';
import { withTenantRequestSlot } from './tenantRequestLimiter';

export const locationQueryKeys = {
  byTenant: (tenantId: string) => ['dolores', 'locations', tenantId] as const,
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
  };
}
