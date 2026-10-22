import { doloresAxiosClient, parseDoloresResponse } from './client';
import { DashboardOverviewSchema } from '@/schemas/dolores/dashboard';
import type { DashboardOverview } from '@/types/dolores/dashboard';

export const dashboardApi = {
  getOverview: async (signal?: AbortSignal, fromDate?: string, toDate?: string): Promise<DashboardOverview> => {
    const response = await doloresAxiosClient.get<unknown>('/dashboard/overview', {
      signal,
      ...(fromDate && toDate ? { params: { fromDate, toDate } } : {}),
    });
    return parseDoloresResponse(response.data, DashboardOverviewSchema);
  },
};
