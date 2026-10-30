import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  DashboardOverviewSchema,
  DashboardDateRangeSchema,
  DashboardActionItemsPageSchema,
  DashboardActionItemsQuerySchema,
  DailyMachineCupUsageListSchema,
  type TDashboardActionItem,
  type TDashboardActionItemsQuery,
  type TDashboardOverview,
  type TDailyMachineCupUsage,
} from "@/schema/dashboard.schema";

export const dashboardApi = {
  getOverview: async (
    signal?: AbortSignal,
    fromDate?: string,
    toDate?: string,
  ): Promise<TDashboardOverview> => {
    const hasFromDate = fromDate !== undefined;
    const hasToDate = toDate !== undefined;
    if (hasFromDate !== hasToDate) {
      throw new Error("fromDate and toDate must be provided together.");
    }

    const params = hasFromDate && hasToDate
      ? DashboardDateRangeSchema.parse({ fromDate, toDate })
      : undefined;
    const response = await axiosClient.get<unknown>("/dashboard/overview", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
      ...(params ? { params } : {}),
    });
    return DashboardOverviewSchema.parse(response.data);
  },

  getDailyMachineCupUsage: async (
    date: string,
    signal?: AbortSignal,
  ): Promise<TDailyMachineCupUsage[]> => {
    const response = await axiosClient.get<unknown>("/dashboard/daily-cups/machines", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
      params: { date },
    });
    return DailyMachineCupUsageListSchema.parse(response.data);
  },

  listActionItems: async (
    query: TDashboardActionItemsQuery,
    signal?: AbortSignal,
  ): Promise<{ items: TDashboardActionItem[]; hasMore?: boolean }> => {
    const params = DashboardActionItemsQuerySchema.parse(query);
    const response = await axiosClient.get<unknown>("/dashboard/action-items", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
      params,
    });
    return DashboardActionItemsPageSchema.parse(response.data);
  },
};
