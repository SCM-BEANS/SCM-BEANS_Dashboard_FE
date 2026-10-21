'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/apis/dolores/dashboard.api';
import { DoloresApiError } from '@/apis/dolores/client';

export const dashboardQueryKeys = {
  overview: ['dolores', 'dashboard', 'overview'] as const,
};

export function useDashboardOverview(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: fromDate && toDate
      ? [...dashboardQueryKeys.overview, { fromDate, toDate }]
      : dashboardQueryKeys.overview,
    queryFn: ({ signal }) => dashboardApi.getOverview(signal, fromDate, toDate),
    retry: (failureCount, error) => {
      if (error instanceof DoloresApiError && (error.status === 401 || error.status === 403)) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
