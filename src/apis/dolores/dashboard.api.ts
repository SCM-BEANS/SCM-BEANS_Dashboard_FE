import { requestDolores } from './client';
import { DashboardOverviewSchema } from '@/schemas/dolores/dashboard';

export const dashboardApi = {
  getOverview: (signal?: AbortSignal, fromDate?: string, toDate?: string) =>
    requestDolores(
      {
        method: 'GET',
        url: '/dashboard/overview',
        signal,
        ...(fromDate && toDate ? { params: { fromDate, toDate } } : {}),
      },
      DashboardOverviewSchema
    ),
};
