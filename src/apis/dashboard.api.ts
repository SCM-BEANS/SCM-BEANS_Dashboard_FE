import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  DashboardOverviewSchema,
  DashboardDateRangeSchema,
  DashboardActionItemsFilterSchema,
  DashboardActionItemsPageSchema,
  type TDashboardOverview,
  type TDashboardActionItemsFilter,
  type TDashboardActionItemsPage,
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

  getActionItems: async (
    filters: TDashboardActionItemsFilter = {},
    signal?: AbortSignal,
  ): Promise<TDashboardActionItemsPage> => {
    const params = DashboardActionItemsFilterSchema.parse(filters);
    const response = await axiosClient.get<unknown>("/dashboard/action-items", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
      params,
    });
    return DashboardActionItemsPageSchema.parse(response.data);
  },
};
