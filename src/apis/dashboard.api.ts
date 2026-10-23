import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  DashboardOverviewSchema,
  DashboardDateRangeSchema,
  type TDashboardOverview,
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
};
